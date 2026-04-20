import { useCallback, useEffect, useRef, useState } from "react";
import type { ClickCounts } from "@click/shared";
import { getClicks, postClicks } from "./clicksApi";

const FLUSH_DELAY_MS = 400;

/**
 * Tracks global + per-user counts, plus a session-local count.
 *
 * Clicks are applied optimistically to local state for instant feedback, then
 * batched and flushed to the server after a short idle window so a rapid
 * stream of clicks becomes a single request.
 *
 * Pass the current user id (or null when signed out). When that changes we
 * flush pending clicks under the old identity, reset the session counter, and
 * refetch so the per-user count reflects the new identity.
 */
export function useClicks(userId: string | null) {
  const [counts, setCounts] = useState<ClickCounts>({ global: 0, user: null });
  const [session, setSession] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const pendingRef = useRef(0);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const scheduleFlushRef = useRef<() => void>(() => {});

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    const count = pendingRef.current;
    if (count <= 0) return;
    pendingRef.current = 0;
    inFlightRef.current = true;
    try {
      const fresh = await postClicks(count);
      setCounts(fresh);
    } catch {
      pendingRef.current += count;
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current > 0) scheduleFlushRef.current();
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flush();
    }, FLUSH_DELAY_MS);
  }, [flush]);

  useEffect(() => {
    scheduleFlushRef.current = scheduleFlush;
  }, [scheduleFlush]);

  // Whenever identity changes, flush pending clicks under the old identity,
  // reset the local session counter, and refetch counts for the new identity.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (pendingRef.current > 0) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        await flush();
      }
      if (cancelled) return;
      setSession(0);
      try {
        const fresh = await getClicks();
        if (!cancelled) setCounts(fresh);
      } catch {
        // leave previous counts in place on failure
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, flush]);

  const click = useCallback(() => {
    pendingRef.current += 1;
    setSession((s) => s + 1);
    setCounts((c) => ({
      global: c.global + 1,
      user: c.user === null ? null : c.user + 1,
    }));
    scheduleFlush();
  }, [scheduleFlush]);

  useEffect(() => {
    const onHide = () => {
      if (pendingRef.current > 0) void flush();
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  return { counts, session, loaded, click };
}
