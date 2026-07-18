"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Satellite,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe2,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────
interface PipelineEvent {
  type: string;
  message: string;
  data?: Record<string, unknown>;
}

interface SourceStatus {
  status: "pending" | "running" | "done" | "error";
  fetched?: number;
  inserted?: number;
  duplicates?: number;
  errors?: number;
  message?: string;
}

const SOURCES = ["GDELT", "RSS", "NewsAPI", "GNews", "MediaStack"];

// ─── Component ────────────────────────────────────────────────────────
export function FetchNewsButton({
  onComplete,
  compact = false,
}: {
  onComplete?: () => void;
  compact?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<
    Record<string, SourceStatus>
  >({});
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const handleFetch = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setShowPanel(true);
    setEvents([]);
    setStats(null);
    setDone(false);
    setExpanded(false);

    // Initialize all sources as pending
    const initial: Record<string, SourceStatus> = {};
    SOURCES.forEach((s) => (initial[s] = { status: "pending" }));
    setSourceStatuses(initial);

    try {
      const resp = await fetch("/api/ingest", { method: "POST" });
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event: PipelineEvent = JSON.parse(line);
            setEvents((prev) => [...prev, event]);

            // Update source statuses based on events
            if (event.type === "source_start") {
              const source = event.data?.source as string;
              if (source) {
                setSourceStatuses((prev) => ({
                  ...prev,
                  [source]: {
                    status: "running",
                    fetched: event.data?.count as number,
                  },
                }));
              }
            } else if (event.type === "source_done") {
              const source = event.data?.source as string;
              const s = event.data?.stats as Record<string, number> | undefined;
              if (source) {
                setSourceStatuses((prev) => ({
                  ...prev,
                  [source]: {
                    status: event.data?.error ? "error" : "done",
                    fetched: s?.fetched,
                    inserted: s?.inserted,
                    duplicates: s?.duplicates,
                    errors: s?.errors,
                    message: event.message,
                  },
                }));
              }
            } else if (event.type === "complete") {
              setStats(
                (event.data?.stats as Record<string, unknown>) || null
              );
            }
          } catch {
            // Ignore malformed lines
          }
        }
      }
    } catch (e) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          message: `Pipeline failed: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]);
    } finally {
      setRunning(false);
      setDone(true);
      onComplete?.();
    }
  }, [running, onComplete]);

  const handleClose = () => {
    if (!running) {
      setShowPanel(false);
    }
  };

  // ─── Compact variant (for dashboard header) ─────────────────────────
  if (compact) {
    return (
      <>
        <button
          id="fetch-news-compact-btn"
          onClick={handleFetch}
          disabled={running}
          className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-gradient-to-r from-blue-600 to-cyan-600 text-white
                     hover:from-blue-500 hover:to-cyan-500
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-300 shadow-lg shadow-blue-500/20
                     hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Satellite className="h-4 w-4" />
          )}
          {running ? "Fetching..." : "Fetch News"}
          {!running && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
          )}
        </button>

        {showPanel && (
          <PipelineModal
            events={events}
            sourceStatuses={sourceStatuses}
            stats={stats}
            running={running}
            done={done}
            expanded={expanded}
            setExpanded={setExpanded}
            logRef={logRef}
            onClose={handleClose}
          />
        )}
      </>
    );
  }

  // ─── Full-size variant (for feed page) ──────────────────────────────
  return (
    <>
      <button
        id="fetch-news-btn"
        onClick={handleFetch}
        disabled={running}
        className="group relative w-full flex items-center justify-center gap-3 px-6 py-4
                   rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/80 to-cyan-950/60
                   hover:from-blue-900/80 hover:to-cyan-900/60 hover:border-blue-400/40
                   disabled:opacity-60 disabled:cursor-not-allowed
                   transition-all duration-500 overflow-hidden"
      >
        {/* Animated background radar effect */}
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute h-24 w-24 rounded-full border border-blue-500/10 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute h-16 w-16 rounded-full border border-cyan-500/15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          </div>
        )}

        <div className="relative flex items-center gap-3">
          {running ? (
            <div className="relative">
              <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
              <div className="absolute inset-0 h-6 w-6 rounded-full border-2 border-cyan-400/30 animate-ping" />
            </div>
          ) : (
            <div className="relative">
              <Satellite className="h-6 w-6 text-blue-400 group-hover:text-cyan-300 transition-colors duration-300" />
              <Radio className="absolute -top-1 -right-1 h-3 w-3 text-cyan-400 animate-pulse" />
            </div>
          )}
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
              {running ? "Pipeline Running..." : "Fetch & Analyze News"}
            </div>
            <div className="text-[11px] text-slate-400 group-hover:text-slate-300 transition-colors">
              {running
                ? "Processing articles with AI analysis"
                : "GDELT · RSS · NewsAPI · GNews · MediaStack"}
            </div>
          </div>
          {!running && (
            <Zap className="h-5 w-5 text-yellow-500/60 group-hover:text-yellow-400 transition-colors ml-2" />
          )}
        </div>

        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
      </button>

      {showPanel && (
        <PipelineModal
          events={events}
          sourceStatuses={sourceStatuses}
          stats={stats}
          running={running}
          done={done}
          expanded={expanded}
          setExpanded={setExpanded}
          logRef={logRef}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// ─── Pipeline Progress Modal ──────────────────────────────────────────
function PipelineModal({
  events,
  sourceStatuses,
  stats,
  running,
  done,
  expanded,
  setExpanded,
  logRef,
  onClose,
}: {
  events: PipelineEvent[];
  sourceStatuses: Record<string, SourceStatus>;
  stats: Record<string, unknown> | null;
  running: boolean;
  done: boolean;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  logRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg mx-4 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl
                    shadow-blue-500/10 overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 bg-slate-800/50">
          <div className="flex items-center gap-3">
            {running ? (
              <div className="relative">
                <Globe2 className="h-5 w-5 text-blue-400" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                </span>
              </div>
            ) : done ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Globe2 className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                {running
                  ? "Ingestion Pipeline Running"
                  : done
                    ? "Pipeline Complete"
                    : "Pipeline"}
              </h3>
              <p className="text-[11px] text-slate-400">
                {running ? "Processing articles..." : done ? "All sources processed" : ""}
              </p>
            </div>
          </div>
          {!running && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 text-sm px-2 py-1 rounded hover:bg-slate-700/60 transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* Source status grid */}
        <div className="px-5 py-3 border-b border-slate-700/30">
          <div className="grid grid-cols-5 gap-2">
            {SOURCES.map((source) => {
              const s = sourceStatuses[source];
              return (
                <div
                  key={source}
                  className={`flex flex-col items-center p-2 rounded-lg text-center transition-all duration-300 ${
                    s?.status === "running"
                      ? "bg-blue-500/10 border border-blue-500/30"
                      : s?.status === "done"
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : s?.status === "error"
                          ? "bg-red-500/10 border border-red-500/20"
                          : "bg-slate-800/40 border border-slate-700/20"
                  }`}
                >
                  <div className="mb-1">
                    {s?.status === "running" ? (
                      <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                    ) : s?.status === "done" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : s?.status === "error" ? (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 leading-tight">
                    {source}
                  </span>
                  {s?.inserted !== undefined && (
                    <span className="text-[9px] text-emerald-400 mt-0.5">
                      +{s.inserted}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats summary (shown when done) */}
        {stats && (
          <div className="px-5 py-3 border-b border-slate-700/30 bg-emerald-500/5">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-slate-100">
                  {(stats.total_fetched as number) || 0}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Fetched
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-400">
                  {(stats.total_inserted as number) || 0}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  New
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">
                  {(stats.total_duplicates as number) || 0}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Duplicates
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">
                  {(stats.total_analyzed as number) || 0}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                  Analyzed
                </div>
              </div>
            </div>
            {typeof stats.duration_seconds === "number" && (
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Completed in {stats.duration_seconds.toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Event log (expandable) */}
        <div className="px-5 py-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? "Hide" : "Show"} activity log ({events.length} events)
          </button>
        </div>

        {expanded && (
          <div
            ref={logRef}
            className="max-h-48 overflow-y-auto px-5 pb-4 custom-scrollbar"
          >
            <div className="space-y-1">
              {events.map((event, i) => (
                <div
                  key={i}
                  className={`text-[11px] leading-relaxed font-mono ${
                    event.type === "error" || event.type === "article_error"
                      ? "text-red-400"
                      : event.type === "article_done"
                        ? "text-emerald-400/80"
                        : event.type === "complete"
                          ? "text-cyan-400 font-semibold"
                          : "text-slate-400"
                  }`}
                >
                  {event.message}
                </div>
              ))}
              {running && (
                <div className="flex items-center gap-2 text-[11px] text-blue-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Processing...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
