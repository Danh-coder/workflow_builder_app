import { useState, useCallback, useEffect, useRef } from "react";
import {
    Cpu,
    Monitor,
    Shield,
    Key,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    Globe,
    Trash2,
    Hash,
    RefreshCw,
    Clock,
    Info,
    Wifi,
    WifiOff,
} from "lucide-react";
import clsx from "clsx";
import { AppSettings, AIProvider, ModelEntry } from "../types";
import { loadSettings, saveSettings } from "../services/settingsStore";
import {
    testConnection,
    TestResult,
    fetchModels,
    FetchedModel,
} from "../services/connectionTest";
import { providerDefaults } from "../data/mockData";

// ── Helpers ────────────────────────────────────────────────────────
function uid() {
    return Math.random().toString(36).slice(2, 10);
}

const aiProviders: AIProvider[] = [
    "AIHoc",
    "OpenAI",
    "Gemini",
    "Claude",
    "Local Model",
];

const adapterPermissions = [
    {
        id: "accessibility",
        name: "Accessibility",
        description: "Required to control UI elements and read screen content.",
        granted: true,
    },
    {
        id: "screen-recording",
        name: "Screen Recording",
        description: "Required to capture screenshots for debugging.",
        granted: true,
    },
    {
        id: "file-system",
        name: "File System",
        description: "Required to read/write files during automation.",
        granted: true,
    },
    {
        id: "browser-automation",
        name: "Browser Automation",
        description: "Required to control web browsers.",
        granted: true,
    },
];

// ── Sub-components ─────────────────────────────────────────────────
function SectionTitle({
    icon: Icon,
    label,
}: {
    icon: React.ElementType;
    label: string;
}) {
    return (
        <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-indigo-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">{label}</h2>
        </div>
    );
}

function FieldLabel({
    children,
    hint,
}: {
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="flex items-center gap-1.5 mb-1.5">
            <label className="text-xs font-medium text-slate-400">
                {children}
            </label>
            {hint && <span className="text-[10px] text-slate-600">{hint}</span>}
        </div>
    );
}

function Toggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
}: {
    checked: boolean;
    onChange?: () => void;
    label: string;
    description?: string;
    disabled?: boolean;
}) {
    return (
        <div
            className={clsx(
                "flex items-start justify-between py-3 gap-4",
                disabled && "cursor-not-allowed",
            )}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-300">{label}</div>
                {description && (
                    <div className="text-xs text-slate-600 mt-0.5">
                        {description}
                    </div>
                )}
            </div>
            <button
                onClick={disabled ? undefined : onChange}
                disabled={disabled}
                aria-disabled={disabled}
                title={
                    disabled ? "This setting is managed by the app" : undefined
                }
                className={clsx(
                    "relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 mt-0.5",
                    disabled
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer",
                    checked
                        ? "bg-indigo-600"
                        : "bg-surface-4 border border-border",
                )}
            >
                <span
                    className={clsx(
                        "absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                        checked ? "translate-x-5" : "translate-x-0",
                    )}
                />
            </button>
        </div>
    );
}

function TestResultBadge({
    result,
    testing,
}: {
    result: TestResult | null;
    testing: boolean;
}) {
    if (testing) {
        return (
            <span className="flex items-center gap-1.5 text-xs text-indigo-400 animate-fade-in">
                <RefreshCw size={12} className="animate-spin" />
                Testing connection…
            </span>
        );
    }
    if (!result) return null;
    return (
        <div
            className={clsx(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs border animate-fade-in",
                result.ok
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/5 border-red-500/20 text-red-400",
            )}
        >
            {result.ok ? (
                <Wifi size={13} className="flex-shrink-0 mt-0.5" />
            ) : (
                <WifiOff size={13} className="flex-shrink-0 mt-0.5" />
            )}
            <div>
                <div className="font-medium">{result.message}</div>
                {result.detail && (
                    <div className="text-[11px] opacity-70 mt-0.5">
                        {result.detail}
                    </div>
                )}
                <div className="flex items-center gap-1 mt-1 opacity-60">
                    <Clock size={10} />
                    <span>{result.latencyMs}ms</span>
                </div>
            </div>
        </div>
    );
}

function ModelRow({
    entry,
    index,
    total,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
}: {
    entry: ModelEntry;
    index: number;
    total: number;
    onUpdate: (patch: Partial<ModelEntry>) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <div
            className={clsx(
                "group flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors",
                index === 0
                    ? "bg-indigo-500/5 border-indigo-500/20"
                    : index === 1
                      ? "bg-violet-500/5 border-violet-500/15"
                      : "bg-surface-2 border-border hover:border-border-bright",
            )}
        >
            {/* Up / Down reorder */}
            <div className="flex flex-col flex-shrink-0">
                <button
                    onClick={onMoveUp}
                    disabled={index === 0}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                >
                    <ChevronUp size={12} />
                </button>
                <button
                    onClick={onMoveDown}
                    disabled={index === total - 1}
                    className="text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                >
                    <ChevronDown size={12} />
                </button>
            </div>

            {/* Priority badge */}
            <span
                className={clsx(
                    "text-[9px] font-bold rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap",
                    index === 0
                        ? "bg-indigo-500/10 text-indigo-400"
                        : index === 1
                          ? "bg-violet-500/10 text-violet-400"
                          : "text-slate-600",
                )}
            >
                {index === 0
                    ? "Default"
                    : index === 1
                      ? "Fallback"
                      : `#${index + 1}`}
            </span>

            {/* Display label */}
            <input
                value={entry.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Display name…"
                className="flex-1 min-w-0 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none focus:text-white"
            />

            {/* Model ID */}
            <div className="flex-[1.5] min-w-0 flex items-center gap-1">
                <Hash size={11} className="text-slate-600 flex-shrink-0" />
                <input
                    value={entry.modelId}
                    onChange={(e) => onUpdate({ modelId: e.target.value })}
                    placeholder="model-id or provider/model…"
                    className="w-full bg-transparent text-[11px] font-mono text-slate-400 placeholder-slate-600 outline-none focus:text-slate-200"
                    spellCheck={false}
                />
            </div>

            <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
            >
                <Trash2 size={12} />
            </button>
        </div>
    );
}

// ── Main ───────────────────────────────────────────────────────────
export default function SettingsPage({
    onDirtyChange,
    onSave,
}: {
    onDirtyChange?: (dirty: boolean) => void;
    onSave?: (saved: AppSettings) => void;
}) {
    const savedSnapshot = useRef(loadSettings());
    const [settings, setSettings] = useState<AppSettings>(
        () => savedSnapshot.current,
    );
    const [apiKeyCache, setApiKeyCache] = useState<
        Partial<Record<AIProvider, string>>
    >({});
    const [addPickerKey, setAddPickerKey] = useState(0);
    const [fetchedModels, setFetchedModels] = useState<FetchedModel[] | null>(
        null,
    );
    const [fetchingModels, setFetchingModels] = useState(false);
    const [fetchModelsError, setFetchModelsError] = useState<string | null>(
        null,
    );
    const [showApiKey, setShowApiKey] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [saved, setSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Notify parent + track locally whenever dirty state changes
    useEffect(() => {
        const dirty =
            JSON.stringify(settings) !== JSON.stringify(savedSnapshot.current);
        setIsDirty(dirty);
        onDirtyChange?.(dirty);
    }, [settings, onDirtyChange]);

    const update = useCallback((patch: Partial<AppSettings>) => {
        setSettings((s) => ({ ...s, ...patch }));
        setTestResult(null);
    }, []);

    // ── Switch provider → load its defaults (preserve per-provider API key) ─
    const handleProviderChange = (provider: AIProvider) => {
        const defs = providerDefaults[provider];
        const newModels = defs.models.map((m) => ({ ...m, id: uid() }));
        // Save current key in cache before switching
        const updatedCache = {
            ...apiKeyCache,
            [settings.aiProvider]: settings.apiKey,
        };
        setApiKeyCache(updatedCache);
        // Restore previously entered key for this provider (empty if never used)
        const restoredKey = updatedCache[provider] ?? "";
        setSettings((s) => ({
            ...s,
            aiProvider: provider,
            baseUrl: defs.baseUrl,
            modelEntries: newModels,
            defaultModelId: newModels[0]?.id ?? "",
            fallbackModelId: newModels[1]?.id ?? newModels[0]?.id ?? "",
            apiKey: restoredKey,
        }));
        setTestResult(null);
        setFetchedModels(null);
        setFetchModelsError(null);
    };

    // ── Model mutations ─────────────────────────────────────────────
    const updateModel = (id: string, patch: Partial<ModelEntry>) =>
        setSettings((s) => ({
            ...s,
            modelEntries: s.modelEntries.map((m) =>
                m.id === id ? { ...m, ...patch } : m,
            ),
        }));

    const deleteModel = (id: string) =>
        setSettings((s) => {
            const next = s.modelEntries.filter((m) => m.id !== id);
            return {
                ...s,
                modelEntries: next,
                defaultModelId: next[0]?.id ?? "",
                fallbackModelId: next[1]?.id ?? next[0]?.id ?? "",
            };
        });

    const moveModel = (id: string, dir: -1 | 1) =>
        setSettings((s) => {
            const idx = s.modelEntries.findIndex((m) => m.id === id);
            if (idx < 0) return s;
            const next = [...s.modelEntries];
            const target = idx + dir;
            if (target < 0 || target >= next.length) return s;
            [next[idx], next[target]] = [next[target], next[idx]];
            return {
                ...s,
                modelEntries: next,
                defaultModelId: next[0]?.id ?? "",
                fallbackModelId: next[1]?.id ?? next[0]?.id ?? "",
            };
        });

    const addModelById = (modelId: string) => {
        setAddPickerKey((k) => k + 1); // reset select
        if (modelId === "__custom__") {
            setSettings((s) => {
                const next = [
                    ...s.modelEntries,
                    { id: uid(), label: "", modelId: "" },
                ];
                return {
                    ...s,
                    modelEntries: next,
                    defaultModelId: next[0]?.id ?? s.defaultModelId,
                    fallbackModelId: next[1]?.id ?? s.fallbackModelId,
                };
            });
            return;
        }
        // Look in fetched list first, then fall back to providerDefaults
        const fetched = fetchedModels?.find((m) => m.modelId === modelId);
        const template = providerDefaults[settings.aiProvider].models.find(
            (m) => m.modelId === modelId,
        );
        const newEntry: ModelEntry = {
            id: uid(),
            label: fetched?.label ?? template?.label ?? modelId,
            modelId,
        };
        setSettings((s) => {
            const next = [...s.modelEntries, newEntry];
            return {
                ...s,
                modelEntries: next,
                defaultModelId: s.defaultModelId || next[0]?.id || "",
                fallbackModelId:
                    s.fallbackModelId || next[1]?.id || s.defaultModelId || "",
            };
        });
    };

    // ── Fetch live model list from provider API ──────────────────────
    const handleFetchModels = async () => {
        setFetchingModels(true);
        setFetchModelsError(null);
        try {
            const result = await fetchModels(
                settings.aiProvider,
                settings.apiKey,
                settings.baseUrl,
            );
            if (result.ok) {
                setFetchedModels(result.models);
            } else {
                setFetchModelsError(result.error ?? "Failed to fetch models");
            }
        } finally {
            setFetchingModels(false);
        }
    };

    // ── Test connection (real HTTP) ─────────────────────────────────
    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const result = await testConnection(
                settings.aiProvider,
                settings.apiKey,
                settings.baseUrl,
            );
            setTestResult(result);
        } finally {
            setTesting(false);
        }
    };

    // ── Save to localStorage ────────────────────────────────────────
    const handleSave = useCallback(() => {
        saveSettings(settings);
        savedSnapshot.current = settings;
        setIsDirty(false);
        onDirtyChange?.(false);
        onSave?.(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }, [settings, onDirtyChange, onSave]);

    // ── Discard changes ─────────────────────────────────────────────
    const handleDiscard = useCallback(() => {
        const fresh = loadSettings();
        savedSnapshot.current = fresh;
        setSettings(fresh);
        setIsDirty(false);
        setTestResult(null);
        onDirtyChange?.(false);
    }, [onDirtyChange]);

    const showBaseUrl =
        settings.aiProvider !== "Gemini" && settings.aiProvider !== "Claude";

    return (
        <div className="flex flex-col h-full bg-surface-0">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-border flex-shrink-0 flex items-center justify-between">
                <div>
                    <h1 className="text-base font-semibold text-slate-100">
                        Settings
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Configure AI provider, models, OS adapter, and app
                        preferences
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                            <CheckCircle size={12} /> Saved
                        </span>
                    )}
                    <button
                        onClick={handleDiscard}
                        disabled={!isDirty}
                        className="btn-ghost text-xs py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Discard
                    </button>
                    <button
                        id="settings-save-btn"
                        onClick={handleSave}
                        disabled={!isDirty}
                        className="btn-primary text-xs py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Save Settings
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-2xl space-y-8">
                    {/* ── AI Provider ─────────────────────────────────────── */}
                    <section className="card p-5">
                        <SectionTitle icon={Cpu} label="AI Provider" />

                        {/* Provider chips */}
                        <div className="mb-4">
                            <FieldLabel>Provider</FieldLabel>
                            <div className="flex items-center gap-2 flex-wrap">
                                {aiProviders.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => handleProviderChange(p)}
                                        className={clsx(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                            settings.aiProvider === p
                                                ? "bg-indigo-600/15 text-indigo-300 border-indigo-500/30"
                                                : "bg-surface-3 text-slate-500 border-border hover:text-slate-300",
                                        )}
                                    >
                                        {p}
                                        {p === "AIHoc" && (
                                            <span className="ml-1.5 text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-1.5 py-0.5">
                                                free models
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            {settings.aiProvider === "AIHoc" && (
                                <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-500 bg-surface-3 border border-border rounded-lg px-3 py-2">
                                    <Info
                                        size={12}
                                        className="flex-shrink-0 mt-0.5 text-indigo-400"
                                    />
                                    AIHoc is an AI gateway offering free
                                    open-source models (Llama, Mistral, Gemma)
                                    and premium models (OpenAI, Gemini, Claude)
                                    under one API key. Model IDs follow{" "}
                                    <code className="text-indigo-300 font-mono">
                                        provider/model-name
                                    </code>{" "}
                                    — you can type any model the gateway
                                    supports.
                                </div>
                            )}
                        </div>

                        {/* API Key */}
                        <div className="mb-4">
                            <FieldLabel
                                hint={
                                    settings.aiProvider === "Local Model"
                                        ? "(not required)"
                                        : undefined
                                }
                            >
                                API Key
                            </FieldLabel>
                            <div className="relative">
                                <Key
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                                />
                                <input
                                    type={showApiKey ? "text" : "password"}
                                    value={settings.apiKey}
                                    onChange={(e) =>
                                        update({ apiKey: e.target.value })
                                    }
                                    disabled={
                                        settings.aiProvider === "Local Model"
                                    }
                                    className="input-base w-full pl-9 pr-10 py-2 disabled:opacity-40"
                                    placeholder={
                                        settings.aiProvider === "AIHoc"
                                            ? "aihoc-sk-…"
                                            : settings.aiProvider === "OpenAI"
                                              ? "sk-…"
                                              : settings.aiProvider === "Claude"
                                                ? "sk-ant-…"
                                                : settings.aiProvider ===
                                                    "Gemini"
                                                  ? "AIza…"
                                                  : "Not required for local"
                                    }
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                {settings.aiProvider !== "Local Model" && (
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showApiKey ? (
                                            <EyeOff size={14} />
                                        ) : (
                                            <Eye size={14} />
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Base URL */}
                        {showBaseUrl && (
                            <div className="mb-4">
                                <FieldLabel hint="(editable — supports Azure, proxies, self-hosted)">
                                    Base URL
                                </FieldLabel>
                                <div className="relative">
                                    <Globe
                                        size={14}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                                    />
                                    <input
                                        type="text"
                                        value={settings.baseUrl}
                                        onChange={(e) =>
                                            update({ baseUrl: e.target.value })
                                        }
                                        className="input-base w-full pl-9 pr-3 py-2 font-mono text-xs"
                                        placeholder="https://api.example.com/v1"
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Test Connection */}
                        <div className="space-y-2 mb-6">
                            <button
                                onClick={handleTest}
                                disabled={
                                    testing ||
                                    (!settings.apiKey &&
                                        settings.aiProvider !== "Local Model")
                                }
                                className="btn-secondary text-xs py-1.5 disabled:opacity-50"
                            >
                                {testing ? (
                                    <>
                                        <RefreshCw
                                            size={12}
                                            className="animate-spin"
                                        />{" "}
                                        Testing…
                                    </>
                                ) : (
                                    <>
                                        <Wifi size={12} /> Test Connection
                                    </>
                                )}
                            </button>
                            <TestResultBadge
                                result={testResult}
                                testing={testing}
                            />
                        </div>

                        {/* ── Model list ───────────────────────────────────── */}
                        <div className="border-t border-border pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-xs font-semibold text-slate-400">
                                        Models
                                    </div>
                                    <div className="text-[11px] text-slate-600 mt-0.5">
                                        Edit labels and model IDs freely — type
                                        any model name the provider accepts.
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Fetch models button */}
                                    <button
                                        onClick={handleFetchModels}
                                        disabled={
                                            fetchingModels ||
                                            (!settings.apiKey &&
                                                settings.aiProvider !==
                                                    "Local Model")
                                        }
                                        title={
                                            !settings.apiKey &&
                                            settings.aiProvider !==
                                                "Local Model"
                                                ? "Enter an API key first"
                                                : "Fetch model list from provider"
                                        }
                                        className="btn-ghost text-xs py-1 px-2 disabled:opacity-40"
                                    >
                                        <RefreshCw
                                            size={12}
                                            className={
                                                fetchingModels
                                                    ? "animate-spin"
                                                    : ""
                                            }
                                        />
                                        {fetchingModels
                                            ? "Fetching…"
                                            : fetchedModels
                                              ? `${fetchedModels.length} models fetched`
                                              : "Fetch from API"}
                                    </button>

                                    {/* Add-model picker — shows fetched models when available, else provider defaults */}
                                    <div className="relative">
                                        <select
                                            key={addPickerKey}
                                            defaultValue=""
                                            onChange={(e) => {
                                                if (e.target.value)
                                                    addModelById(
                                                        e.target.value,
                                                    );
                                            }}
                                            className="input-base text-xs py-1 pl-2 pr-7 appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>
                                                + Add model…
                                            </option>
                                            {(
                                                fetchedModels ??
                                                providerDefaults[
                                                    settings.aiProvider
                                                ].models
                                            )
                                                .filter(
                                                    (m) =>
                                                        !settings.modelEntries.some(
                                                            (e) =>
                                                                e.modelId ===
                                                                m.modelId,
                                                        ),
                                                )
                                                .map((m) => (
                                                    <option
                                                        key={m.modelId}
                                                        value={m.modelId}
                                                    >
                                                        {m.label !== m.modelId
                                                            ? `${m.label} — ${m.modelId}`
                                                            : m.modelId}
                                                    </option>
                                                ))}
                                            <option value="__custom__">
                                                Custom (manual entry)…
                                            </option>
                                        </select>
                                        <ChevronDown
                                            size={11}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                        />
                                    </div>
                                </div>
                                {fetchModelsError && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1">
                                        <AlertCircle size={11} />{" "}
                                        {fetchModelsError}
                                    </div>
                                )}
                            </div>

                            {/* Column headers */}
                            {settings.modelEntries.length > 0 && (
                                <div className="flex items-center gap-2 px-2 mb-1">
                                    <div className="w-5" />
                                    <div className="w-14 text-[10px] text-slate-600 uppercase tracking-widest">
                                        Priority
                                    </div>
                                    <div className="flex-1 text-[10px] text-slate-600 uppercase tracking-widest">
                                        Label
                                    </div>
                                    <div className="flex-[1.5] text-[10px] text-slate-600 uppercase tracking-widest">
                                        Model ID
                                    </div>
                                    <div className="w-12" />
                                    <div className="w-6" />
                                </div>
                            )}

                            {settings.modelEntries.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-600 border border-dashed border-border rounded-lg">
                                    No models yet. Click <strong>Add</strong> to
                                    create one.
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {settings.modelEntries.map(
                                        (entry, index) => (
                                            <ModelRow
                                                key={entry.id}
                                                entry={entry}
                                                index={index}
                                                total={
                                                    settings.modelEntries.length
                                                }
                                                onUpdate={(patch) =>
                                                    updateModel(entry.id, patch)
                                                }
                                                onDelete={() =>
                                                    deleteModel(entry.id)
                                                }
                                                onMoveUp={() =>
                                                    moveModel(entry.id, -1)
                                                }
                                                onMoveDown={() =>
                                                    moveModel(entry.id, 1)
                                                }
                                            />
                                        ),
                                    )}
                                </div>
                            )}

                            {/* Hint about priority ordering */}
                            {settings.modelEntries.length > 0 && (
                                <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                                    <Info
                                        size={11}
                                        className="text-slate-600"
                                    />
                                    First row = Default, second row = Fallback.
                                    Drag with ↑↓ to reorder.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── OS Adapter ──────────────────────────────────────── */}
                    <section className="card p-5">
                        <SectionTitle icon={Monitor} label="OS Adapter" />

                        {/* Adapter selector */}
                        <div className="grid grid-cols-2 gap-3 mb-5">
                            {/* Win Use — valid on Windows only */}
                            {(() => {
                                const valid = settings.currentOS === "Windows";
                                const active =
                                    settings.adapterStatus === "Win Use";
                                return (
                                    <button
                                        onClick={() =>
                                            valid &&
                                            update({ adapterStatus: "Win Use" })
                                        }
                                        disabled={!valid}
                                        title={
                                            !valid
                                                ? "Win Use requires Windows"
                                                : undefined
                                        }
                                        className={clsx(
                                            "flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors",
                                            active && valid
                                                ? "bg-indigo-500/10 border-indigo-500/30"
                                                : valid
                                                  ? "bg-surface-3 border-border hover:border-border-bright"
                                                  : "bg-surface-3 border-border opacity-40 cursor-not-allowed",
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Monitor
                                                size={14}
                                                className={
                                                    active && valid
                                                        ? "text-indigo-400"
                                                        : "text-slate-500"
                                                }
                                            />
                                            <span
                                                className={clsx(
                                                    "text-xs font-semibold",
                                                    active && valid
                                                        ? "text-slate-200"
                                                        : "text-slate-400",
                                                )}
                                            >
                                                Win Use
                                            </span>
                                            {active && valid && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-600 leading-snug">
                                            Native Windows automation via UI
                                            Automation APIs.
                                        </div>
                                        {!valid && (
                                            <div className="text-[10px] text-amber-500">
                                                Requires Windows
                                            </div>
                                        )}
                                    </button>
                                );
                            })()}

                            {/* Ghost OS — valid on macOS only */}
                            {(() => {
                                const valid = settings.currentOS === "macOS";
                                const active =
                                    settings.adapterStatus === "Ghost OS";
                                return (
                                    <button
                                        onClick={() =>
                                            valid &&
                                            update({
                                                adapterStatus: "Ghost OS",
                                            })
                                        }
                                        disabled={!valid}
                                        title={
                                            !valid
                                                ? "Ghost OS requires macOS"
                                                : undefined
                                        }
                                        className={clsx(
                                            "flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors",
                                            active && valid
                                                ? "bg-indigo-500/10 border-indigo-500/30"
                                                : valid
                                                  ? "bg-surface-3 border-border hover:border-border-bright"
                                                  : "bg-surface-3 border-border opacity-40 cursor-not-allowed",
                                        )}
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Monitor
                                                size={14}
                                                className={
                                                    active && valid
                                                        ? "text-indigo-400"
                                                        : "text-slate-500"
                                                }
                                            />
                                            <span
                                                className={clsx(
                                                    "text-xs font-semibold",
                                                    active && valid
                                                        ? "text-slate-200"
                                                        : "text-slate-400",
                                                )}
                                            >
                                                Ghost OS
                                            </span>
                                            {active && valid && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-600 leading-snug">
                                            macOS automation via Accessibility
                                            and AppleScript.
                                        </div>
                                        {!valid && (
                                            <div className="text-[10px] text-amber-500">
                                                Requires macOS
                                            </div>
                                        )}
                                    </button>
                                );
                            })()}
                        </div>

                        {/* Status row */}
                        <div className="flex items-center gap-3 p-3 bg-surface-3 border border-border rounded-lg mb-4">
                            <Monitor
                                size={16}
                                className="text-indigo-400 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-200">
                                    {settings.adapterStatus}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {settings.currentOS} · active adapter
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={clsx(
                                        "w-2 h-2 rounded-full",
                                        settings.adapterStatus !==
                                            "Not Connected"
                                            ? "bg-emerald-400"
                                            : "bg-red-400",
                                    )}
                                />
                                <span
                                    className={clsx(
                                        "text-xs font-medium",
                                        settings.adapterStatus !==
                                            "Not Connected"
                                            ? "text-emerald-400"
                                            : "text-red-400",
                                    )}
                                >
                                    {settings.adapterStatus !== "Not Connected"
                                        ? "Connected"
                                        : "Disconnected"}
                                </span>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                            Permissions
                        </div>
                        <div className="space-y-2">
                            {adapterPermissions.map((perm) => (
                                <div
                                    key={perm.id}
                                    className="flex items-start gap-3 p-3 bg-surface-3 border border-border rounded-lg"
                                >
                                    <div
                                        className={clsx(
                                            "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                                            perm.granted
                                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                                : "bg-surface-4 border border-border",
                                        )}
                                    >
                                        {perm.granted ? (
                                            <CheckCircle
                                                size={13}
                                                className="text-emerald-400"
                                            />
                                        ) : (
                                            <AlertCircle
                                                size={13}
                                                className="text-slate-500"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-slate-300 mb-0.5">
                                            {perm.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 leading-relaxed">
                                            {perm.description}
                                        </div>
                                    </div>
                                    <button
                                        disabled
                                        title="Permission controls are managed by the app"
                                        className={clsx(
                                            "text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors flex-shrink-0 mt-0.5 cursor-not-allowed opacity-60",
                                            perm.granted
                                                ? "text-slate-500 border-border"
                                                : "text-indigo-400 border-indigo-500/30 bg-accent-50",
                                        )}
                                    >
                                        {perm.granted ? "Revoke" : "Grant"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── Security ────────────────────────────────────────── */}
                    <section className="card p-5">
                        <SectionTitle icon={Shield} label="Security" />
                        <div className="divide-y divide-border">
                            <Toggle
                                checked={settings.storeApiKeySecurely}
                                disabled
                                label="Store API key securely"
                                description="Saves the key in the OS keychain instead of plain localStorage."
                            />
                            <Toggle
                                checked={settings.askBeforeRiskyActions}
                                disabled
                                label="Ask confirmation before risky actions"
                                description="Prompts before submitting forms, sending messages, or deleting files."
                            />
                            <Toggle
                                checked={settings.blockDestructiveActions}
                                disabled
                                label="Block payment & destructive actions by default"
                                description="Requires explicit override to run steps that make purchases or irreversible changes."
                            />
                        </div>
                    </section>

                    {/* Bottom save */}
                    <div className="flex justify-end gap-3 pb-4">
                        <button
                            onClick={handleDiscard}
                            disabled={!isDirty}
                            className="btn-secondary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Discard Changes
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className="btn-primary text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {saved ? (
                                <>
                                    <CheckCircle size={14} /> Saved!
                                </>
                            ) : (
                                "Save Settings"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
