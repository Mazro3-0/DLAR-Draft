import { useEffect, useState } from "react";
import {
  livePlayers,
  loadFinishedMatch,
  loadStatHeroes,
  reduceLiveRow,
  streamLiveMatch,
} from "./stats";

export function useMatchStats(source) {
  const [result, setResult] = useState({
    match: null,
    status: "idle",
    message: "Enter a match ID to begin.",
    updated: null,
  });
  const id = source?.id,
    mode = source?.mode,
    attempt = source?.attempt;
  useEffect(() => {
    if (!id) {
      const idle = setTimeout(
        () =>
          setResult((r) => ({
            ...r,
            status: r.match ? "disconnected" : "idle",
            message: r.match
              ? "Preview disconnected · last received values retained"
              : "Enter a match ID to begin.",
          })),
        0,
      );
      return () => clearTimeout(idle);
    }
    const controller = new AbortController();
    let rows = new Map(),
      pending = null,
      ended = false,
      match = null;
    let heroInfo = {};
    const timeout =
      mode === "finished"
        ? setTimeout(() => controller.abort("timeout"), 30000)
        : null;
    const publish = () => {
      pending = null;
      if (!controller.signal.aborted) {
        match = {
          id,
          mode: "live",
          players: livePlayers(rows),
          duration: 0,
          heroInfo,
        };
        setResult({
          match,
          status: "live",
          message: "Receiving match updates",
          updated: Date.now(),
        });
      }
    };
    const run = async () => {
      setResult({
        match: null,
        status: "loading",
        message:
          mode === "live"
            ? "Waiting for a spectatable broadcast…"
            : "Loading match statistics…",
        updated: null,
      });
      try {
        if (mode === "finished") {
          match = await loadFinishedMatch(id, controller.signal);
          if (!controller.signal.aborted)
            setResult({
              match,
              status: "finished",
              message: "Finished match · recorded statistics",
              updated: Date.now(),
            });
          return;
        }
        loadStatHeroes(controller.signal)
          .then((heroes) => {
            heroInfo = heroes;
            if (!controller.signal.aborted)
              setResult((r) =>
                r.match ? { ...r, match: { ...r.match, heroInfo } } : r,
              );
          })
          .catch(() => {});
        await streamLiveMatch(id, {
          signal: controller.signal,
          onEvent: ({ event, data }) => {
            if (event === "error") {
              let message =
                "The live feed stopped. Check the match ID and spectator access.";
              try {
                const v = JSON.parse(data);
                message = String(v.error || v.message || message).slice(0, 240);
              } catch {
                /* plain stream error */
              }
              throw Error(message);
            }
            if (event === "end") {
              ended = true;
              return;
            }
            if (event === "status") {
              setResult((r) => ({
                ...r,
                message:
                  "The broadcast is starting. Waiting for player updates…",
              }));
              return;
            }
            if (event !== "message") return;
            let row;
            try {
              row = JSON.parse(data);
            } catch {
              return;
            }
            const next = reduceLiveRow(rows, row);
            if (next === rows) return;
            rows = next;
            if (pending === null) pending = setTimeout(publish, 250);
          },
        });
        if (!controller.signal.aborted) {
          if (pending !== null) {
            clearTimeout(pending);
            publish();
          }
          setResult((r) => ({
            ...r,
            status: ended ? "ended" : "error",
            message: ended
              ? "Broadcast ended. Load the finished match to verify final totals."
              : "Connection closed. Last received values are retained; reconnect to resume.",
          }));
        }
      } catch (error) {
        if (pending !== null) {
          clearTimeout(pending);
          pending = null;
        }
        if (controller.signal.aborted && controller.signal.reason !== "timeout")
          return;
        setResult((r) => ({
          ...r,
          status: "error",
          message:
            controller.signal.reason === "timeout"
              ? "The stats request timed out. Try loading the match again."
              : error.message,
        }));
      } finally {
        if (timeout !== null) clearTimeout(timeout);
      }
    };
    // Deferring avoids duplicate requests during React StrictMode's setup check.
    const start = setTimeout(run, 0);
    return () => {
      clearTimeout(start);
      if (pending !== null) clearTimeout(pending);
      if (timeout !== null) clearTimeout(timeout);
      controller.abort();
    };
  }, [id, mode, attempt]);
  return result;
}
