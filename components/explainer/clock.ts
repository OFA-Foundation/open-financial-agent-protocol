"use client";

// Every value on the stage is a function of the time in milliseconds. The
// clock holds that time and calls its listeners on each change, and the
// listeners write styles to the DOM. React renders the stage once, so a frame
// costs no render, and any frame can be drawn again from its time alone.

import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";

type Listener = (time: number) => void;

export class Clock {
  private time = 0;
  private readonly listeners = new Set<Listener>();

  get now(): number {
    return this.time;
  }

  set(time: number): void {
    this.time = time;
    for (const listener of this.listeners) listener(time);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.time);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const ClockContext = createContext<Clock | null>(null);

/**
 * Calls `draw` with the current time when it mounts, and on each change of
 * the time. Returns a function that draws again at the same time, for after a
 * change of size.
 */
export function useFrame(draw: Listener): () => void {
  const clock = useContext(ClockContext);
  const latest = useRef(draw);
  useLayoutEffect(() => {
    latest.current = draw;
  });
  useLayoutEffect(() => clock?.subscribe((time) => latest.current(time)), [clock]);
  return useCallback(() => latest.current(clock?.now ?? 0), [clock]);
}

export function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function easeOut(value: number): number {
  return 1 - (1 - value) ** 3;
}

export function easeInOut(value: number): number {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

/** 0 before `start`, then up to 1 over `length`. */
export function progress(time: number, start: number, length: number): number {
  return clamp((time - start) / length);
}

/** 0 outside `from`–`to`, 1 inside it, with an eased fade at each end. */
export function presence(time: number, from: number, to = Infinity, fadeIn = 320, fadeOut = 200): number {
  if (time < from || time >= to) return 0;
  return Math.min(easeOut(progress(time, from, fadeIn)), easeOut(clamp((to - time) / fadeOut)));
}

/** How long an item of a sequence waits after its start, so the item before it has mostly faded out. */
export const HANDOFF_MS = 140;

/**
 * For one item of a sequence that the next item replaces at `to`: 0 before
 * `from`, then in over `fadeIn` after HANDOFF_MS, and out over `fadeOut` from `to`.
 */
export function crossfade(time: number, from: number, to = Infinity, fadeIn = 340, fadeOut = 180): number {
  if (time >= to) return 1 - easeOut(progress(time, to, fadeOut));
  return easeOut(progress(time, from + HANDOFF_MS, fadeIn));
}

const written = new WeakMap<Element, string>();

/** Sets the styles of an element, and skips the write when they did not change since the last frame. */
export function paint(element: HTMLElement | null, styles: { opacity?: number; transform?: string; visibility?: boolean }): void {
  if (!element) return;
  const key = `${styles.opacity}|${styles.transform}|${styles.visibility}`;
  if (written.get(element) === key) return;
  written.set(element, key);
  if (styles.opacity !== undefined) element.style.opacity = styles.opacity.toFixed(3);
  if (styles.transform !== undefined) element.style.transform = styles.transform;
  if (styles.visibility !== undefined) element.style.visibility = styles.visibility ? "visible" : "hidden";
}

/** Shows an element at `amount` (0 to 1), and moves it `rise` pixels up and `shift` pixels across as it comes in. */
export function show(element: HTMLElement | null, amount: number, rise = 0, shift = 0): void {
  const moved = amount < 1 && (rise || shift);
  paint(element, {
    opacity: amount,
    visibility: amount > 0,
    transform: moved ? `translate3d(${((1 - amount) * shift).toFixed(2)}px, ${((1 - amount) * rise).toFixed(2)}px, 0)` : "",
  });
}
