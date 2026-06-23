import { AIProvider } from '../types';

export interface TestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  detail?: string;
}

export interface FetchedModel {
  modelId: string;
  label: string;
}

export interface FetchModelsResult {
  ok: boolean;
  models: FetchedModel[];
  error?: string;
}

// ── Low-level HTTP helper ─────────────────────────────────────────
// Routes through Electron main process IPC to avoid renderer CORS.
// Falls back to fetch() when running in a plain browser.
async function request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; ok: boolean; text: string; error: string | null }> {
  const api = window.electronAPI;

  if (api?.httpRequest) {
    return api.httpRequest({ method, url, headers, body });
  }

  // Browser dev fallback (may hit CORS for some providers)
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    return { status: res.status, ok: res.ok, text, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, ok: false, text: '', error: msg };
  }
}

// ── Parse error body ──────────────────────────────────────────────
function parseErrorMsg(text: string): string {
  try {
    const j = JSON.parse(text);
    return (
      j?.error?.message ??
      j?.message ??
      j?.detail ??
      text.slice(0, 120)
    );
  } catch {
    return text.slice(0, 120);
  }
}

// ── Parse model count from success body ──────────────────────────
function parseModelCount(text: string): number | undefined {
  try {
    const j = JSON.parse(text);
    return (
      j?.data?.length ??
      j?.models?.length ??
      j?.object === 'list' ? j?.data?.length : undefined
    );
  } catch {
    return undefined;
  }
}

// ── Main exported function ────────────────────────────────────────
export async function testConnection(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
): Promise<TestResult> {
  if (!apiKey && provider !== 'Local Model') {
    return { ok: false, message: 'No API key provided', latencyMs: 0 };
  }

  const base = baseUrl.replace(/\/+$/, '');
  const start = Date.now();

  try {
    let res: Awaited<ReturnType<typeof request>>;

    switch (provider) {
      // AIHoc and OpenAI both use the OpenAI-compatible /models endpoint
      case 'AIHoc':
      case 'OpenAI':
        res = await request('GET', `${base}/models`, {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        });
        break;

      case 'Gemini':
        res = await request(
          'GET',
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=5`,
          {},
        );
        break;

      case 'Claude':
        res = await request('GET', 'https://api.anthropic.com/v1/models', {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        });
        break;

      case 'Local Model': {
        // Try Ollama /api/tags first, then OpenAI-compat /v1/models
        res = await request('GET', `${base}/api/tags`, {});
        if (!res.ok && !res.error) {
          res = await request('GET', `${base}/v1/models`, {});
        }
        break;
      }

      default:
        return { ok: false, message: 'Unknown provider', latencyMs: 0 };
    }

    const latencyMs = Date.now() - start;

    if (res.error) {
      return {
        ok: false,
        message: `Network error: ${res.error}`,
        latencyMs,
        detail: 'Check that the base URL is reachable and your internet connection is active.',
      };
    }

    if (!res.ok) {
      const detail = parseErrorMsg(res.text);
      if (res.status === 401) return { ok: false, message: 'Invalid API key (401 Unauthorized)', latencyMs, detail };
      if (res.status === 403) return { ok: false, message: 'Access forbidden (403) — check key permissions', latencyMs, detail };
      if (res.status === 404) return { ok: false, message: 'Endpoint not found (404) — check base URL', latencyMs, detail };
      if (res.status === 429) return { ok: false, message: 'Rate limited (429) — try again later', latencyMs, detail };
      return { ok: false, message: `HTTP ${res.status} error`, latencyMs, detail };
    }

    const count = parseModelCount(res.text);
    const countStr = count !== undefined ? ` · ${count} model${count !== 1 ? 's' : ''} available` : '';
    return {
      ok: true,
      message: `Connected successfully${countStr}`,
      latencyMs,
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      latencyMs: Date.now() - start,
    };
  }
}

// ── fetchModels ───────────────────────────────────────────────────
// Calls the provider's model-list endpoint and returns parsed model IDs.
function parseModelsFromResponse(provider: AIProvider, text: string): FetchedModel[] {
  try {
    const j = JSON.parse(text);
    switch (provider) {
      case 'AIHoc':
      case 'OpenAI':
        return (j?.data ?? []).map((m: { id: string }) => ({
          modelId: m.id,
          label: m.id,
        }));
      case 'Gemini':
        return (j?.models ?? [])
          .filter((m: { supportedGenerationMethods?: string[] }) =>
            !m.supportedGenerationMethods ||
            m.supportedGenerationMethods.includes('generateContent'),
          )
          .map((m: { name: string; displayName?: string }) => {
            const id = m.name.replace(/^models\//, '');
            return { modelId: id, label: m.displayName ?? id };
          });
      case 'Claude':
        return (j?.data ?? []).map((m: { id: string; display_name?: string }) => ({
          modelId: m.id,
          label: m.display_name ?? m.id,
        }));
      case 'Local Model':
        // Ollama /api/tags
        if (j?.models) {
          return (j.models as { name: string }[]).map(m => ({
            modelId: m.name,
            label: m.name,
          }));
        }
        // OpenAI-compat /v1/models fallback
        return (j?.data ?? []).map((m: { id: string }) => ({
          modelId: m.id,
          label: m.id,
        }));
      default:
        return [];
    }
  } catch {
    return [];
  }
}

export async function fetchModels(
  provider: AIProvider,
  apiKey: string,
  baseUrl: string,
): Promise<FetchModelsResult> {
  if (!apiKey && provider !== 'Local Model') {
    return { ok: false, models: [], error: 'Enter an API key first.' };
  }

  const base = baseUrl.replace(/\/+$/, '');

  try {
    let res: Awaited<ReturnType<typeof request>>;

    switch (provider) {
      case 'AIHoc':
      case 'OpenAI':
        res = await request('GET', `${base}/models`, {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        });
        break;
      case 'Gemini':
        res = await request(
          'GET',
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
          {},
        );
        break;
      case 'Claude':
        res = await request('GET', 'https://api.anthropic.com/v1/models', {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        });
        break;
      case 'Local Model': {
        res = await request('GET', `${base}/api/tags`, {});
        if (!res.ok && !res.error) {
          res = await request('GET', `${base}/v1/models`, {});
        }
        break;
      }
      default:
        return { ok: false, models: [], error: 'Unknown provider' };
    }

    if (res.error) {
      return { ok: false, models: [], error: `Network error: ${res.error}` };
    }
    if (!res.ok) {
      return { ok: false, models: [], error: parseErrorMsg(res.text) || `HTTP ${res.status}` };
    }

    const models = parseModelsFromResponse(provider, res.text);
    return { ok: true, models };
  } catch (err: unknown) {
    return {
      ok: false,
      models: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
