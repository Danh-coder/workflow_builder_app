/**
 * planWorkflow.ts
 *
 * Calls the configured LLM provider to generate a structured Workflow object
 * from a plain-English task description.  Uses the same IPC http-request
 * pathway as connectionTest.ts so there are no renderer CORS issues.
 */

import { AIProvider, ChatMessage, Workflow, WorkflowStep, AppSettings } from '../types';

// ── Internal HTTP helper ──────────────────────────────────────────
async function request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ ok: boolean; status: number; text: string; error: string | null }> {
  const api = window.electronAPI;
  if (api?.httpRequest) {
    return api.httpRequest({ method, url, headers, body });
  }
  try {
    // Longer timeout for chat completions (model inference)
    const isInference = url.includes('/chat/completions') || url.includes('/completions');
    const timeoutMs = isInference ? 120_000 : 30_000;
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, error: null };
  } catch (err: unknown) {
    return { ok: false, status: 0, text: '', error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Planning system prompt ────────────────────────────────────────
const PLANNING_PROMPT = `You are an expert workflow planner for Windows-Use, an AI agent that controls Windows desktops via the UI Automation API. Your job is to decompose a natural-language task into a precise, ordered list of steps that map directly to the agent's available tools.

═══════════════════════════════════════════════════════════
WINDOWS-USE TOOL REFERENCE
═══════════════════════════════════════════════════════════

CORE INTERACTION TOOLS
──────────────────────
• app_tool        — Launch app from Start Menu, switch to open window, or resize/reposition active window
                    modes: launch | switch | resize
                    use for: opening Notepad, Chrome, Excel; focusing a specific window; arranging windows

• click_tool      — Click at pixel coordinates on screen
                    options: left/right/middle button; single/double/hover (clicks=0/1/2)
                    use for: pressing buttons, selecting items, opening files (double-click), context menus (right-click)

• type_tool       — Click an input field and type text into it (auto-focuses the field)
                    options: clear existing text, press Enter after typing, control caret position
                    use for: search bars, form fields, address bars, text editors, dialog inputs
                    ⚠ NEVER use type_tool to send keyboard shortcuts (ctrl+c, ctrl+v, etc.) — use shortcut_tool instead

• scroll_tool     — Scroll content at a location
                    options: vertical/horizontal; up/down/left/right; wheel_times controls amount
                    use for: navigating long pages, lists, documents, reaching off-screen elements

• shortcut_tool   — Press keyboard shortcuts (use '+' to combine keys)
                    examples: ctrl+c, ctrl+v, ctrl+z, ctrl+s, ctrl+a, ctrl+f, ctrl+w, ctrl+t,
                              alt+tab, alt+f4, enter, escape, win, tab, delete, f5
                    use for: copy/paste, save, undo, close, switch windows, submit dialogs

• move_tool       — Move mouse cursor or drag from current position to target
                    drag=false: hover to reveal tooltips / reposition cursor
                    drag=true:  drag from current position to target; use duration to control speed
                    duration:   seconds for the drag — 0.5 (default, fast) or 3.0 (slow, for seek/progress bars)
                    ⚠ For video/audio seek bars always use drag=true, duration=3.0 so the UI tracks the position.
                    ⚠ After any seek-bar drag, always add wait_tool(1s) + scrape_tool to verify the timestamp.

• wait_tool       — Pause for N seconds
                    typical: 2s for UI transitions, 3-5s for app launch, 5-10s for page loads
                    use for: waiting for apps/pages/dialogs to appear before next action

BROWSER & WEB TOOLS
────────────────────
• app_tool (launch browser)  — Open the browser.
                    When the user names a specific browser (e.g. "Google Chrome"), use that exact name.
                    Use the FULL Start Menu name: "Google Chrome" (not "Chrome"), "Microsoft Edge", "Mozilla Firefox".
                    If no browser is specified, use whichever browser is currently open in Desktop State.
                    After launching OR switching to ANY browser, ALWAYS open a new window with
                    shortcut_tool(ctrl+n) before navigating — never reuse an existing window/tab.
• type_tool on address bar  — Navigate to a URL (click address bar, type URL, press Enter)
• scrape_tool     — Extract full readable text from the current browser page via accessibility tree
                    returns markdown of page content with scroll position info
                    use for: reading page content, extracting data, verifying page loaded

FILE SYSTEM TOOLS
──────────────────
• file_tool       — Read, write, list, delete, move, or copy files
                    modes: read | write | list | delete | move | copy | exists
                    paths: absolute ("C:\\Users\\me\\file.txt") or relative to home ("Desktop\\notes.txt")
                    use for: saving scraped data, reading config, organizing output files

• shell_tool      — Execute PowerShell commands; returns output + exit code (0=success)
                    working directory: user HOME
                    use for: complex file ops, system queries, running scripts, installing packages,
                              downloading files via curl/wget, querying registry

MULTI-ELEMENT TOOLS (experimental — use when filling multiple fields at once)
────────────────────────────────────────────────────────────────────────────
• multi_edit_tool     — Fill multiple form fields in one action: list of [x, y, text] entries
• multi_select_tool   — Click multiple locations; with press_ctrl=true for multi-selection

MEMORY TOOL (use for complex multi-step tasks that need to store intermediate data)
────────────────────────────────────────────────────────────────────────────────────
• memory_tool     — Read/write persistent markdown files in ~/.windows-use/memory/
                    modes: view | read | write | update | delete
                    use for: storing scraped content, saving intermediate results across steps

VIRTUAL DESKTOP TOOL
─────────────────────
• desktop_tool    — Create, remove, rename, or switch Windows virtual desktops
                    use for: workspace organisation in complex multi-app workflows

DONE TOOL (always the final step)
───────────────────────────────────
• done_tool       — Delivers the final answer/summary to the user (ONLY way to communicate)
                    use as the last step of every workflow

═══════════════════════════════════════════════════════════
WORKFLOW PLANNING RULES
═══════════════════════════════════════════════════════════

1. STEP GRANULARITY — Each step should correspond to ONE tool call.
   Good: "Launch Chrome", "Navigate to URL", "Wait for page load", "Click Login button"
   Bad:  "Open browser and login"

2. WAIT STEPS — Always include a wait_tool step after:
   - Launching an application (2-5s)
   - Navigating to a URL (2-3s)
   - Clicking a button that triggers a page/dialog (1-2s)
   - Starting a download (variable)

3. NAVIGATION PATTERN — Standard browser navigation sequence:
   a. Check Desktop State for an already-open browser window.
   b. If a browser IS open:  app_tool(switch, <browser name>) → shortcut_tool(ctrl+n) → wait_tool(1)
   c. If NO browser is open: app_tool(launch "Google Chrome" or user-specified browser) → wait_tool(3)
      then STILL run shortcut_tool(ctrl+n) → wait_tool(1) to guarantee a fresh tab.
   d. type_tool(address bar, URL, press_enter=true) → wait_tool(2) → [interact]
   ⚠ shortcut_tool(ctrl+n) is MANDATORY in every browser workflow step — never skip it.
   ⚠ Use "Google Chrome" (full name) when Chrome is requested — NOT the short alias "Chrome".
   ⚠ NEVER reuse the user's existing browser window/tab.

4. LOGIN PATTERN — Standard login sequence:
   type_tool(username field) → type_tool(password field) → click_tool(login button) OR shortcut_tool(enter)

5. COPY FROM FIELD PATTERN — To copy text from any field (address bar, input, text area):
   click_tool(the field to focus it) → shortcut_tool(ctrl+a) → shortcut_tool(ctrl+c)
   NEVER use type_tool to type keyboard shortcuts like "ctrl+c" — type_tool is ONLY for typing real text into inputs.

6. SAVE AS DIALOG PATTERN — When a Save As / Open dialog appears:
   a. click_tool(empty space in the address bar at the TOP of the dialog) — this activates the address bar into edit mode so it can accept keyboard input. The existing path text becomes selected/editable. This click is REQUIRED before typing.
   b. type_tool(address bar, full folder path e.g. "C:\\Users\\Username\\Desktop", press_enter=true) — navigates the dialog to the correct folder.
   c. wait_tool(1s) — let the folder contents update.
   d. type_tool("File name" input field at the BOTTOM of the dialog, desired filename, press_enter=true) — OR click Save.
   NEVER skip step (a). Typing into the address bar without first clicking the empty space sends text to the wrong element.
   For new documents triggered via ctrl+s: shortcut_tool(ctrl+s) → wait_tool(1s) → then follow steps a–d above.

6b. CALCULATOR / BUTTON-INPUT APPS — For applications that accept input through individual clickable buttons
   (Calculator, numeric keypads, or any app where digits are buttons rather than a text field):
   Use click_tool for EACH digit, operator, and function button individually.
   Do NOT use type_tool on these interfaces — type_tool sends keystrokes to the OS focus target, which is
   often NOT the calculator display, producing wrong results.
   After clicking all buttons, read the result from the display element in Desktop State before calling done_tool.

6c. URL EXTRACTION PATTERN — To obtain the URL of a link on a webpage:
   click_tool(the link) → wait_tool(1-2s for page to load) → click_tool(browser address bar) →
   shortcut_tool(ctrl+a) → shortcut_tool(ctrl+c) → read the URL from the address bar element in Desktop State.
   Do NOT infer or construct URLs from link text, anchor labels, or visible text alone.
   The browser address bar is an editable text element visible at the top of the browser window in Desktop State.

6d. AUTHORITATIVE SOURCE DATA PATTERN — When the task requires specific structured metrics
   (e.g. GitHub star counts, npm download stats, package versions, issue counts), do NOT rely on
   what may or may not appear in a Google search result snippet. Always navigate directly to the
   primary source and scrape it there:
   - GitHub stars: type_tool(address bar, "https://github.com/<owner>/<repo>") → wait_tool → scrape_tool → read star count.
   - npm stats:    type_tool(address bar, "https://www.npmjs.com/package/<name>") → wait_tool → scrape_tool.
   - PyPI stats:   type_tool(address bar, "https://pypi.org/project/<name>/") → wait_tool → scrape_tool.
   Apply this for any data point that has a known canonical URL. Use a new tab (shortcut_tool ctrl+t)
   to fetch each source without losing the previous page.

7. VIDEO SEEK / PROGRESS BAR PATTERN — Use this exact iterative approach:
   a. move_tool(center of the video player, drag=false) — hover to reveal player controls.
      The seek bar and time display ("0:12 / 2:59") will appear in Desktop State Interactive Elements.
   b. Read x_start, x_end, y from the seek bar element.
   c. Read total_duration by parsing the time display element (format: "current / total").
      ⚠ NEVER estimate or assume the duration — you MUST read it from the time display after hovering.
   d. Calculate target_x: x_start + (target_seconds / total_seconds) × (x_end − x_start)
   e. click_tool(target_x, y) — click the calculated position to jump near the target.
   f. wait_tool(1) — let the player update the timestamp.
   g. move_tool(center of video, drag=false) — hover again to reveal updated controls.
   h. Read the current timestamp from the time display in Desktop State.
   i. If off by more than 2 seconds:
      - Too early (timestamp < target): move_tool(drag=true, duration=2.0) slightly to the right
      - Too late  (timestamp > target): move_tool(drag=true, duration=2.0) slightly to the left
   j. Repeat steps f–i until the timestamp is within 2 seconds of the target.
   k. done_tool — only after confirming the timestamp is correct.
   NEVER estimate total duration. NEVER call done_tool without verifying the timestamp.

8. GENERAL RESULT VERIFICATION — For any action whose outcome can be read from the screen
   (timestamp changed, file saved, text pasted, page navigated), always add a scrape_tool or
   wait_tool + scrape_tool step to confirm the expected state before calling done_tool.

9. FILE OUTPUT — Always end data-extraction tasks with file_tool(write) or memory_tool(write).

10. RISK LEVELS:
   Low    = read-only: browsing, scraping, reading files, extracting data
   Medium = writes: form submission, file creation, app configuration
   High   = destructive or privileged: deleting files, running install scripts, credential handling,
             modifying system settings, shell commands that mutate state

11. STEP COUNT — Aim for 6-20 steps. More is better than vague.

12. APP NAMES FOR APP_TOOL — Use the exact name as it appears in the Windows Start Menu:
    ✅ "Notepad" | "Word" | "Excel" | "PowerPoint" | "Paint" | "Calculator" |
       "File Explorer" | "Microsoft Edge" | "Google Chrome" | "Mozilla Firefox" |
       "Outlook" | "Teams" | "Vivaldi" | "Brave"
    ⚠ BROWSERS require their full name: "Google Chrome" NOT "Chrome", "Microsoft Edge" NOT "Edge".
    ❌ Do NOT use: "Microsoft Notepad", "Open Word", "winword.exe", "Launch Excel application"

13. NOTEPAD / WORD / EXCEL — ALWAYS OPEN A NEW TAB OR DOCUMENT
   Every workflow that involves Notepad, Word, or Excel MUST include these steps IN ORDER,
   with NO exceptions, even for simple tasks:
   Step A → actionType: "app_tool",      target: "launch Notepad"  (or Word / Excel)
   Step B → actionType: "wait_tool",     target: "3"
   Step C → actionType: "shortcut_tool", target: "ctrl+n"   ← MANDATORY — opens a fresh tab/document
   Step D → actionType: "wait_tool",     target: "1"
   Step E → (continue with type_tool, shortcut_tool, etc.)
   ⚠ NEVER skip Step C. The ctrl+n step MUST appear as its own explicit step in the steps array.
   ⚠ Do NOT use shell_tool to launch these apps — always use app_tool.

═══════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════

Return ONLY a valid JSON object — no markdown fences, no commentary:

{
  "name": "<4-8 word workflow title>",
  "goal": "<one sentence: what the workflow achieves>",
  "description": "<2-3 sentences: how it works and what the user gets>",
  "riskLevel": "Low" | "Medium" | "High",
  "requiredPermissions": [
    "Browser control" | "File download" | "Screen reading" |
    "File system access" | "Shell commands" | "Clipboard access"
  ],
  "supportedOS": ["Windows"],
  "steps": [
    {
      "stepNumber": 1,
      "actionType": "app_tool" | "click_tool" | "type_tool" | "scroll_tool" |
                    "shortcut_tool" | "move_tool" | "wait_tool" | "scrape_tool" |
                    "file_tool" | "shell_tool" | "memory_tool" | "multi_edit_tool" |
                    "multi_select_tool" | "desktop_tool" | "done_tool",
      "target": "<specific, concrete target: app name / URL / element label / file path / command / key combo>",
      "expectedResult": "<observable outcome: what should be true after this step succeeds>"
    }
  ]
}

IMPORTANT: actionType must be one of the exact tool names above. Use the most specific tool available.`;

// ── Parse raw LLM text into Workflow ─────────────────────────────
function parseWorkflowJson(raw: string, task: string): Workflow {
  // Strip potential markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const obj = JSON.parse(cleaned);

  const steps: WorkflowStep[] = (obj.steps ?? []).map(
    (s: { stepNumber: number; actionType: string; target: string; expectedResult: string }, i: number) => ({
      id: `s${i + 1}`,
      stepNumber: s.stepNumber ?? i + 1,
      actionType: s.actionType ?? 'Action',
      target: s.target ?? '',
      expectedResult: s.expectedResult ?? '',
      status: 'Pending' as const,
    }),
  );

  const now = new Date().toISOString();
  return {
    id: `wf-${Math.random().toString(36).slice(2, 10)}`,
    name: obj.name ?? 'Workflow',
    goal: obj.goal ?? task,
    // Preserve the verbatim user message so startRun can send it to the agent
    // instead of the generic goal description.
    originalTask: task,
    description: obj.description ?? '',
    osAdapter: 'Win Use',
    requiredPermissions: obj.requiredPermissions ?? [],
    riskLevel: obj.riskLevel ?? 'Low',
    status: 'Ready',
    steps,
    supportedOS: obj.supportedOS ?? ['Windows'],
    createdAt: now,
    updatedAt: now,
    estimatedSteps: steps.length,
  };
}

// ── Build prior-conversation turns for context (last 10 messages) ──
// Strips workflowPreview from content to keep payloads small.
function buildHistory(history: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return history.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

// ── Error helpers ─────────────────────────────────────────────────

/** Translate an HTTP status to a short human-readable label. */
function httpStatusLabel(status: number): string {
  const labels: Record<number, string> = {
    400: 'Bad request (400)',
    401: 'Invalid API key (401)',
    403: 'Access forbidden (403)',
    404: 'Model or endpoint not found (404)',
    422: 'Unprocessable request (422)',
    429: 'Rate limit exceeded (429) — try again in a moment',
    500: 'Provider server error (500)',
    503: 'Provider unavailable (503)',
  };
  return labels[status] ?? `HTTP ${status}`;
}

/**
 * Extract the most useful error string from a failed API response body.
 * Handles OpenAI, Anthropic, and Gemini error shapes.
 */
function parseApiError(text: string, status: number): string {
  if (!text) return httpStatusLabel(status);
  try {
    const j = JSON.parse(text);
    // OpenAI / AIHoc / Local Model shape: { error: { message, type, code } }
    const openaiMsg = j?.error?.message;
    if (openaiMsg) return `${httpStatusLabel(status)}: ${openaiMsg}`;
    // Anthropic shape: { error: { type, message } }
    const anthropicMsg = j?.error?.message ?? j?.message;
    if (anthropicMsg) return `${httpStatusLabel(status)}: ${anthropicMsg}`;
    // Gemini shape: { error: { code, message, status } }
    const geminiMsg = j?.error?.message;
    if (geminiMsg) return `${httpStatusLabel(status)}: ${geminiMsg}`;
  } catch {
    // not JSON — fall through
  }
  const snippet = text.trim().slice(0, 200);
  return `${httpStatusLabel(status)}${snippet ? `: ${snippet}` : ''}`;
}

/**
 * Throw a descriptive error for a failed request, covering both
 * network failures (res.error non-null) and HTTP error responses.
 */
function throwRequestError(providerName: string, res: { ok: boolean; status: number; text: string; error: string | null }): never {
  if (res.error) {
    // Network-level failure: DNS, timeout, refused connection, CORS
    throw new Error(`${providerName}: network error — ${res.error}`);
  }
  throw new Error(`${providerName}: ${parseApiError(res.text, res.status)}`);
}

// ── Provider-specific LLM call ────────────────────────────────────
async function callLLM(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
  modelId: string,
  task: string,
  history: ChatMessage[],
  systemPrompt: string = PLANNING_PROMPT,
): Promise<string> {
  const base = baseUrl.replace(/\/+$/, '');
  const prior = buildHistory(history);

  switch (provider) {
    // ── OpenAI / AIHoc (OpenAI-compat) / Local Model ──────────────
    case 'OpenAI':
    case 'AIHoc':
    case 'Local Model': {
      const endpoint =
        provider === 'Local Model'
          ? `${base}/v1/chat/completions`
          : provider === 'AIHoc'
            ? `${base}/chat/completions`
            : 'https://api.openai.com/v1/chat/completions';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

      const body = JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...prior,
          { role: 'user', content: task },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        temperature: 0.3,
      });

      const res = await request('POST', endpoint, headers, body);
      if (!res.ok || res.error) throwRequestError(provider, res);
      const json = JSON.parse(res.text);
      return json.choices?.[0]?.message?.content ?? '';
    }

    // ── Anthropic ─────────────────────────────────────────────────
    case 'Claude': {
      const res = await request(
        'POST',
        'https://api.anthropic.com/v1/messages',
        {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        JSON.stringify({
          model: modelId,
          max_tokens: 2048,
          system: systemPrompt,
          messages: [...prior, { role: 'user', content: task }],
        }),
      );
      if (!res.ok || res.error) throwRequestError('Claude', res);
      const json = JSON.parse(res.text);
      return json.content?.[0]?.text ?? '';
    }

    // ── Google Gemini ─────────────────────────────────────────────
    case 'Gemini': {
      if (!apiKey) throw new Error('Gemini: no API key configured — add it in Settings');
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      // Gemini needs alternating user/model turns
      const geminiContents = prior.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      geminiContents.push({ role: 'user', parts: [{ text: task }] });
      const res = await request(
        'POST',
        endpoint,
        { 'Content-Type': 'application/json' },
        JSON.stringify({
          contents: geminiContents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
      );
      if (!res.ok || res.error) throwRequestError('Gemini', res);
      const json = JSON.parse(res.text);
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ── Resolve the active model ID from settings ─────────────────────
function resolveModelId(settings: AppSettings): string {
  const entry = settings.modelEntries.find((m) => m.id === settings.defaultModelId);
  return entry?.modelId ?? 'gpt-4o';
}

// ── Step-result verifier (vision) ─────────────────────────────────
const VERIFY_STEP_PROMPT = `You are a desktop automation step verifier.
A UI automation tool just executed on Windows. You are given a screenshot taken IMMEDIATELY after the tool ran.
Your job: verify whether the step ACTUALLY succeeded based on what you observe on screen.

Respond ONLY with valid JSON — no markdown, no explanation:
{"verified": true, "note": "brief description of what you see confirming success"}
{"verified": false, "note": "brief description of what you see that contradicts success"}

verified=true  → the screenshot clearly shows the action took effect (page navigated, text typed, element clicked, file saved, etc.)
verified=false → the screen looks unchanged, shows an error, shows wrong content, or contradicts the reported result.
When genuinely uncertain, default to verified=true.`;

/** Call the configured LLM with a single screenshot and text prompt (no conversation history). */
async function callLLMWithVision(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
  modelId: string,
  userMessage: string,
  imageB64: string,
): Promise<string> {
  const base = baseUrl.replace(/\/+$/, '');
  const FALLBACK = '{"verified":true,"note":""}';

  switch (provider) {
    case 'OpenAI':
    case 'AIHoc':
    case 'Local Model': {
      const endpoint =
        provider === 'Local Model'
          ? `${base}/v1/chat/completions`
          : provider === 'AIHoc'
            ? `${base}/chat/completions`
            : 'https://api.openai.com/v1/chat/completions';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      const res = await request('POST', endpoint, headers, JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: VERIFY_STEP_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userMessage },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageB64}`, detail: 'low' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0,
      }));
      if (!res.ok || res.error) return FALLBACK;
      const json = JSON.parse(res.text);
      return json.choices?.[0]?.message?.content ?? FALLBACK;
    }

    case 'Claude': {
      const res = await request(
        'POST',
        'https://api.anthropic.com/v1/messages',
        { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        JSON.stringify({
          model: modelId,
          max_tokens: 150,
          system: VERIFY_STEP_PROMPT,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } },
              { type: 'text', text: userMessage },
            ],
          }],
        }),
      );
      if (!res.ok || res.error) return FALLBACK;
      const json = JSON.parse(res.text);
      return json.content?.[0]?.text ?? FALLBACK;
    }

    case 'Gemini': {
      if (!apiKey) return FALLBACK;
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await request(
        'POST',
        endpoint,
        { 'Content-Type': 'application/json' },
        JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: imageB64 } },
              { text: userMessage },
            ],
          }],
          systemInstruction: { parts: [{ text: VERIFY_STEP_PROMPT }] },
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 150, temperature: 0 },
        }),
      );
      if (!res.ok || res.error) return FALLBACK;
      const json = JSON.parse(res.text);
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? FALLBACK;
    }

    default:
      return FALLBACK;
  }
}

/**
 * Verify a single automation step using a screenshot taken right after the tool ran.
 * Always resolves (never throws) — returns verified=true on any error so it never blocks the run.
 */
export async function verifyStepResult(
  tool: string,
  result: string,
  expectedResult: string,
  screenshotB64: string,
  settings: AppSettings,
): Promise<{ verified: boolean; note: string }> {
  if (!settings.apiKey && settings.aiProvider !== 'Local Model') {
    return { verified: true, note: '' };
  }
  const modelId = resolveModelId(settings);
  if (!modelId) return { verified: true, note: '' };

  const userMessage =
    `Tool executed: ${tool}\n` +
    `Tool reported: ${result}\n` +
    `Expected: ${expectedResult || 'n/a'}\n\n` +
    `Does the screenshot confirm this step actually succeeded?`;

  try {
    const raw = await callLLMWithVision(
      settings.aiProvider,
      settings.apiKey,
      settings.baseUrl,
      modelId,
      userMessage,
      screenshotB64,
    );
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const obj = JSON.parse(cleaned);
    return { verified: Boolean(obj.verified), note: String(obj.note ?? '') };
  } catch {
    return { verified: true, note: '' };
  }
}

// ── Completion verifier ───────────────────────────────────────────
const VERIFY_PROMPT = `You are a task-completion verifier for a Windows desktop automation system.
You will receive the original user request and the automation agent's final answer.
Determine whether the agent FULLY completed the user's exact request.

RULES:
- complete: false → agent asked for clarification, said it needs more info, only partially finished, opened the wrong thing, or the answer does not confirm the task is done
- complete: true  → agent confirms all actions in the original request were successfully performed
- When in doubt, default to complete: true so you don't block genuine successes

Respond ONLY with valid JSON (no markdown, no explanation):
{"complete": true/false, "issue": "one-sentence reason if not complete, empty string if complete"}`;

export async function verifyCompletion(
  originalTask: string,
  agentAnswer: string,
  settings: AppSettings,
): Promise<{ complete: boolean; issue: string }> {
  if (!settings.apiKey && settings.aiProvider !== 'Local Model') {
    // No key → skip verification, assume complete
    return { complete: true, issue: '' };
  }
  const modelId = resolveModelId(settings);
  if (!modelId) return { complete: true, issue: '' };

  const message = `Original request: "${originalTask}"\n\nAgent answer: "${agentAnswer}"`;
  try {
    const raw = await callLLM(
      settings.aiProvider,
      settings.apiKey,
      settings.baseUrl,
      modelId,
      message,
      [],
      VERIFY_PROMPT,
    );
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const obj = JSON.parse(cleaned);
    return { complete: Boolean(obj.complete), issue: String(obj.issue ?? '') };
  } catch {
    // Never block completion due to verifier errors
    return { complete: true, issue: '' };
  }
}

// ── Main export ───────────────────────────────────────────────────
export async function planWorkflow(
  task: string,
  settings: AppSettings,
  history: ChatMessage[] = [],
): Promise<Workflow> {
  if (!settings.apiKey && settings.aiProvider !== 'Local Model') {
    throw new Error(`No API key configured for ${settings.aiProvider} — add it in Settings`);
  }
  const modelId = resolveModelId(settings);
  if (!modelId) {
    throw new Error(`No model selected for ${settings.aiProvider} — choose one in Settings`);
  }
  const raw = await callLLM(settings.aiProvider, settings.apiKey, settings.baseUrl, modelId, task, history);
  if (!raw.trim()) throw new Error('LLM returned an empty response');
  return parseWorkflowJson(raw, task);
}
