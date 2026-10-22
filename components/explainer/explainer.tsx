"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ExplainerData } from "../../lib/explainer-data";
import { Clock, ClockContext, clamp, useFrame } from "./clock";
import { INTRO_MS, OUTRO_MS, buildScript, type Script } from "./script";
import { Stage, type Layout } from "./stage";
import styles from "./explainer.module.css";

const CANVAS: Record<Layout, { width: number; height: number }> = {
  landscape: { width: 1024, height: 576 },
  portrait: { width: 400, height: 600 },
};

/** Below this frame width, the stage uses the narrow layout. */
const PORTRAIT_BELOW = 760;
const PORTRAIT_MAX_SCALE = 1.3;

/** What the recorder (a headless browser on `/?record`) calls to draw each frame. */
export interface ExplainerRecorder {
  start: number;
  end: number;
  seek(time: number): void;
}

declare global {
  interface Window {
    ofapExplainer?: ExplainerRecorder;
  }
}

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function Explainer({ data }: { data: ExplainerData }) {
  const script = useMemo(() => buildScript(data), [data]);
  const clock = useMemo(() => new Clock(), []);
  const [record, setRecord] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fit, setFit] = useState<{ layout: Layout; scale: number; left: number; top: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const autoPaused = useRef(false);
  const started = useRef(false);

  const start = record ? -INTRO_MS : 0;
  const end = record ? script.duration + OUTRO_MS : script.duration;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("record")) setRecord(true);
  }, []);

  useEffect(() => {
    if (!record) return;
    document.documentElement.style.overflow = "hidden";
    clock.set(start);
    window.ofapExplainer = { start, end, seek: (time) => clock.set(time) };
    return () => {
      delete window.ofapExplainer;
    };
  }, [record, clock, start, end]);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      const layout: Layout = !record && width < PORTRAIT_BELOW ? "portrait" : "landscape";
      const canvas = CANVAS[layout];
      const scale = record
        ? Math.min(width / canvas.width, height / canvas.height)
        : layout === "portrait"
          ? Math.min(PORTRAIT_MAX_SCALE, width / canvas.width)
          : width / canvas.width;
      setFit({ layout, scale, left: (width - canvas.width * scale) / 2, top: record ? (height - canvas.height * scale) / 2 : 0 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [record]);

  useEffect(() => {
    if (!playing) return;
    let request = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // A frame after a hidden tab adds at most 64 ms, so the stage never jumps.
      const next = Math.min(end, clock.now + Math.min(64, now - last));
      last = now;
      clock.set(next);
      if (next >= end) {
        setPlaying(false);
        return;
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, clock, end]);

  useEffect(() => {
    const element = frame.current;
    if (!element || record) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) clock.set(script.duration);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || reduced) return;
        if (entry.isIntersecting && (!started.current || autoPaused.current)) {
          started.current = true;
          autoPaused.current = false;
          setPlaying(true);
        } else if (!entry.isIntersecting) {
          setPlaying((current) => {
            if (current) autoPaused.current = true;
            return false;
          });
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [clock, record, script.duration]);

  const seek = useCallback(
    (time: number) => {
      started.current = true;
      autoPaused.current = false;
      clock.set(time);
    },
    [clock],
  );

  const toggle = () => {
    started.current = true;
    autoPaused.current = false;
    if (!playing && clock.now >= end) clock.set(start);
    setPlaying(!playing);
  };

  const canvas = CANVAS[fit?.layout ?? "landscape"];

  return (
    <ClockContext.Provider value={clock}>
      <figure className={styles.figure} aria-label="How OFAP works on top of MCP and PAP">
        <div className={styles.frame} ref={frame} data-record={record ? "" : undefined} aria-hidden="true">
          <div
            style={{
              position: "absolute",
              left: fit?.left ?? 0,
              top: fit?.top ?? 0,
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${fit?.scale ?? 1})`,
              transformOrigin: "0 0",
            }}
          >
            <Stage data={data} script={script} layout={fit?.layout ?? "landscape"} titles={record} ready={fit !== null} />
          </div>
        </div>
        {record ? null : (
          <>
            <Controls script={script} playing={playing} end={end} onToggle={toggle} onSeek={seek} />
            <details className={styles.transcript}>
              <summary>Transcript</summary>
              <ol>
                {script.captions.map((caption) => (
                  <li key={caption.at}>
                    <button type="button" onClick={() => seek(caption.at)}>
                      {formatTime(caption.at)}
                    </button>
                    <span>{caption.text}</span>
                  </li>
                ))}
              </ol>
            </details>
          </>
        )}
      </figure>
    </ClockContext.Provider>
  );
}

interface ControlsProps {
  script: Script;
  playing: boolean;
  end: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
}

function Controls({ script, playing, end, onToggle, onSeek }: ControlsProps) {
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const time = useRef<HTMLSpanElement>(null);

  useFrame((now) => {
    script.chapters.forEach((chapter, index) => {
      const next = script.chapters[index + 1]?.at ?? script.duration;
      const fill = fills.current[index];
      if (fill) fill.style.transform = `scaleX(${clamp((now - chapter.at) / (next - chapter.at)).toFixed(4)})`;
      const button = buttons.current[index];
      const current = now >= chapter.at && (now < next || index === script.chapters.length - 1);
      if (button && current !== (button.getAttribute("aria-current") === "step")) {
        if (current) button.setAttribute("aria-current", "step");
        else button.removeAttribute("aria-current");
      }
    });
    if (time.current) time.current.textContent = `${formatTime(now)} / ${formatTime(end)}`;
  });

  return (
    <div className={styles.controls}>
      <button type="button" className={styles.play} onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
        {playing ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3" y="2" width="3.5" height="12" rx="1" />
            <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.6-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5Z" />
          </svg>
        )}
      </button>
      <ol className={styles.chapters}>
        {script.chapters.map((chapter, index) => {
          const next = script.chapters[index + 1]?.at ?? script.duration;
          return (
            <li key={chapter.title} style={{ flexGrow: next - chapter.at }}>
              <button
                type="button"
                ref={(element) => {
                  buttons.current[index] = element;
                }}
                onClick={() => onSeek(chapter.at)}
                aria-label={`Chapter ${index + 1}: ${chapter.title}`}
              >
                <span className={styles.bar}>
                  <span
                    ref={(element) => {
                      fills.current[index] = element;
                    }}
                  />
                </span>
                <span className={styles.chapterTitle}>{chapter.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <span ref={time} className={styles.time} />
    </div>
  );
}
