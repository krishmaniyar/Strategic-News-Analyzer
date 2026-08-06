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
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-lg
                     bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                     hover:from-blue-500 hover:to-indigo-500
                     disabled:opacity-60 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-blue-700/20
                     hover:shadow-blue-700/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Satellite className="h-3.5 w-3.5" />
          )}
          {running ? "Fetching..." : "Fetch News"}
          {!running && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
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
                   rounded-xl overflow-hidden transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: running
            ? "rgba(59,130,246,0.06)"
            : "linear-gradient(135deg, rgba(37,99,235,0.12), rgba(79,70,229,0.08))",
          border: `1px solid ${running ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)"}`,
          boxShadow: running ? "0 0 30px rgba(59,130,246,0.1)" : "none",
        }}
      >
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute h-24 w-24 rounded-full border border-blue-500/[0.08] animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute h-14 w-14 rounded-full border border-indigo-500/[0.1] animate-ping" style={{ animationDuration: "2s", animationDelay: "0.5s" }} />
          </div>
        )}
        <div className="relative flex items-center gap-3">
          {running ? (
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
          ) : (
            <div className="relative">
              <Satellite className="h-5 w-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <Radio className="absolute -top-1 -right-1 h-2.5 w-2.5 text-cyan-400 animate-pulse" />
            </div>
          )}
          <div className="text-left">
            <div className="text-[13px] font-semibold text-slate-200 group-hover:text-white transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {running ? "Pipeline Running..." : "Fetch & Analyze News"}
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              {running ? "Processing articles with AI analysis..." : "GDELT · RSS · NewsAPI · GNews · MediaStack"}
            </div>
          </div>
          {!running && <Zap className="h-4 w-4 text-amber-500/50 group-hover:text-amber-400 transition-colors ml-2" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(6,7,16,0.97)",
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.05)",
          backdropFilter: "blur(40px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.05]"
          style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2.5">
            {running ? (
              <div className="relative">
                <Globe2 className="h-4 w-4 text-blue-400" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400/60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
              </div>
            ) : done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Globe2 className="h-4 w-4 text-slate-500" />
            )}
            <div>
              <h3 className="text-[13px] font-semibold text-slate-200" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {running ? "Ingestion Pipeline Running" : done ? "Pipeline Complete" : "Pipeline"}
              </h3>
              <p className="text-[10px] font-mono text-slate-600">
                {running ? "Processing articles with AI analysis..." : done ? "All sources processed" : ""}
              </p>
            </div>
          </div>
          {!running && (
            <button onClick={onClose}
              className="text-[11px] text-slate-500 hover:text-slate-200 px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-all border border-transparent hover:border-white/[0.08]">
              Close
            </button>
          )}
        </div>

        {/* Source status grid */}
        <div className="px-5 py-3 border-b border-white/[0.05]">
          <div className="grid grid-cols-5 gap-2">
            {SOURCES.map((source) => {
              const s = sourceStatuses[source];
              return (
                <div key={source}
                  className="flex flex-col items-center p-2 rounded-xl text-center transition-all duration-300"
                  style={{
                    background: s?.status === "running" ? "rgba(59,130,246,0.08)"
                      : s?.status === "done" ? "rgba(16,185,129,0.07)"
                      : s?.status === "error" ? "rgba(239,68,68,0.07)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${
                      s?.status === "running" ? "rgba(59,130,246,0.25)"
                      : s?.status === "done" ? "rgba(16,185,129,0.2)"
                      : s?.status === "error" ? "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.05)"}`,
                  }}
                >
                  <div className="mb-1">
                    {s?.status === "running" ? <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
                      : s?.status === "done" ? <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      : s?.status === "error" ? <XCircle className="h-3 w-3 text-red-400" />
                      : <div className="h-3 w-3 rounded-full border border-slate-700" />}
                  </div>
                  <span className="text-[9px] font-mono font-medium text-slate-400">{source}</span>
                  {s?.inserted !== undefined && (
                    <span className="text-[8px] font-mono text-emerald-400 mt-0.5">+{s.inserted}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats summary (shown when done) */}
        {stats && (
          <div className="px-5 py-3 border-b border-white/[0.05]" style={{ background: "rgba(16,185,129,0.04)" }}>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: "Fetched",    value: (stats.total_fetched as number) || 0,    color: "#94a3b8" },
                { label: "New",        value: (stats.total_inserted as number) || 0,   color: "#34d399" },
                { label: "Duplicates", value: (stats.total_duplicates as number) || 0, color: "#fbbf24" },
                { label: "Analyzed",   value: (stats.total_analyzed as number) || 0,   color: "#60a5fa" },
              ].map((s, i) => (
                <div key={i}>
                  <p className="stat-number text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {typeof stats.duration_seconds === "number" && (
              <p className="text-center text-[10px] font-mono text-slate-600 mt-2">
                Completed in {(stats.duration_seconds as number).toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Event log (expandable) */}
        <div className="px-5 py-2.5 border-t border-white/[0.04]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} log ({events.length} events)
          </button>
        </div>

        {expanded && (
          <div ref={logRef} className="max-h-44 overflow-y-auto px-5 pb-4">
            <div className="space-y-0.5 font-mono">
              {events.map((event, i) => (
                <div key={i}
                  className={`text-[10px] leading-relaxed ${
                    event.type === "error" || event.type === "article_error" ? "text-red-400"
                    : event.type === "article_done" ? "text-emerald-400/70"
                    : event.type === "complete" ? "text-cyan-400 font-semibold"
                    : "text-slate-600"
                  }`}>
                  {event.message}
                </div>
              ))}
              {running && (
                <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
