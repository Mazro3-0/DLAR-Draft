import { useEffect, useRef, useState } from "react";
import heroes from "./heroes.json";
import { useMatchStats } from "./use-match-stats";
import {
  STATS_KEY,
  METRICS,
  cleanPanel,
  clock,
  displayNumber,
  panelUrl,
  parseMatchId,
  playersAt,
  readPanelUrl,
  sortPlayers,
} from "./stats";
import "./StatPanels.css";

const roster = Object.fromEntries(heroes.map((h) => [h.id, h]));
function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function HeroIcon({ heroId, hero: suppliedHero }) {
  const [failed, setFailed] = useState(false);
  const hero = suppliedHero || roster[heroId];
  return (
    <span className="stat-hero-icon">
      {hero && !failed ? (
        <img src={hero.image} alt={hero.name} onError={() => setFailed(true)} />
      ) : (
        <span aria-label={`Hero ${heroId}`}>✦</span>
      )}
    </span>
  );
}
function useStageScale() {
  const ref = useRef(null),
    [scale, setScale] = useState(0.5);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / 1920),
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, scale];
}
function StatGraphic({
  match,
  panel,
  event,
  time,
  status,
  stale = false,
  visible = true,
}) {
  const rows = sortPlayers(playersAt(match, time), panel);
  const heroRoster = { ...match?.heroInfo, ...roster };
  const metric = METRICS[panel.metric],
    max = Math.max(1, ...rows.map((p) => p[panel.metric] || 0));
  const live = match?.mode === "live",
    unsupported = live && !metric.live;
  const recorded = match?.mode === "finished" && time < match.duration;
  const stateLabel =
    status === "disconnected"
      ? "DISCONNECTED"
      : status === "error"
        ? "CONNECTION LOST"
        : status === "ended"
          ? "FEED ENDED"
          : stale
            ? "DATA DELAYED"
            : live
              ? "LIVE FEED"
              : recorded
                ? `RECORDED · ${clock(time)}`
                : "FINAL STATS";
  const row = (p, rank) => (
    <div className={`stat-player stat-team-${p.team}`} key={p.id}>
      <span className="stat-rank">{String(rank + 1).padStart(2, "0")}</span>
      <HeroIcon key={p.heroId} heroId={p.heroId} hero={heroRoster[p.heroId]} />
      <div className="stat-player-identity">
        <strong dir="auto">
          {panel.names[p.id] ||
            p.name ||
            heroRoster[p.heroId]?.name ||
            `Player ${p.slot}`}
        </strong>
        <span>
          {heroRoster[p.heroId]?.name || `Hero ${p.heroId}`}
          <i> · </i>
          {panel.teamNames[p.team]}
        </span>
      </div>
      <b className="stat-value">{displayNumber(p[panel.metric])}</b>
      <span
        className="stat-meter"
        style={{
          width: `${Math.max(0, ((p[panel.metric] || 0) / max) * 100)}%`,
        }}
      />
    </div>
  );
  return (
    <div className={`stat-canvas ${visible ? "" : "stat-hidden"}`}>
      <section
        className={`stat-box stat-theme-${panel.theme} stat-layout-${panel.layout} stat-position-${panel.position}`}
        style={{ "--panel-scale": panel.scale }}
        aria-label={`${metric.label} broadcast panel`}
      >
        <header className="stat-box-header">
          <div>
            <span className="stat-kicker">
              DEADLOCK AR <i>✦</i> {event || "MATCH STATISTICS"}
            </span>
            <h2>{panel.title || metric.label}</h2>
          </div>
          <span
            className={`stat-source-label ${live ? "live" : ""} ${stale || ["error", "ended", "disconnected"].includes(status) ? "delayed" : ""}`}
          >
            {stateLabel}
          </span>
        </header>
        <div className="stat-box-subhead">
          <span>{metric.unit}</span>
          <span>
            {rows.length} / 12 PLAYERS <i>·</i> #{match?.id || "—"}
          </span>
        </div>
        {unsupported ? (
          <div className="stat-broadcast-empty">
            Permanent-buff counts are available for finished matches. Live
            counts are awaiting verification.
          </div>
        ) : rows.length ? (
          panel.layout === "teams" ? (
            <div className="stat-team-columns">
              {[0, 1].map((team) => (
                <section key={team}>
                  <h3>{panel.teamNames[team]}</h3>
                  {rows
                    .filter((p) => p.team === team)
                    .map((p) => row(p, rows.indexOf(p)))}
                </section>
              ))}
            </div>
          ) : (
            <div className="stat-players">{rows.map(row)}</div>
          )
        ) : (
          <div className="stat-broadcast-empty">
            Waiting for player statistics
          </div>
        )}
        <footer>
          <span>
            {live
              ? "SOURCE BROADCAST MAY BE DELAYED"
              : recorded
                ? "RECORDED SAMPLES · NOT A LIVE FEED"
                : `FINISHED MATCH · ${clock(match?.duration)}`}{" "}
          </span>
          <span>✦</span>
          <span>
            {rows.some((p) => p[panel.metric] === null)
              ? "— = DATA UNAVAILABLE"
              : "COMMUNITY TOURNAMENTS"}
          </span>
        </footer>
      </section>
    </div>
  );
}
function FeedStatus({ result, stale }) {
  return (
    <span className={`stats-feed-state ${result.status}`}>
      <i />
      {stale ? "Feed delayed · last values retained" : result.message}
    </span>
  );
}
function useStaleFeed(result) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  return (
    result.status === "live" && result.updated && now - result.updated > 15000
  );
}
export default function StatPanels({ config, active }) {
  const [initial] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [panel, setPanel] = useState(() => cleanPanel(initial.panel));
  const [input, setInput] = useState(initial.id || "120513539");
  const [sourceMode, setSourceMode] = useState("finished"),
    [source, setSource] = useState(null);
  const [time, setTime] = useState(null),
    [shown, setShown] = useState(true),
    [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const result = useMatchStats(source),
    stale = useStaleFeed(result);
  const [stage, scale] = useStageScale();
  const match = result.match,
    effectiveTime = time ?? match?.duration ?? 0;
  const players = playersAt(match, effectiveTime);
  const heroRoster = { ...match?.heroInfo, ...roster };
  const pending = result.status === "loading";
  const unsupported = match?.mode === "live" && !METRICS[panel.metric].live;
  useEffect(() => {
    try {
      localStorage.setItem(
        STATS_KEY,
        JSON.stringify({ id: source?.id || initial.id || "120513539", panel }),
      );
    } catch {
      /* A usable OBS link can still be copied without local storage. */
    }
  }, [panel, source?.id, initial.id]);
  const update = (key, value) =>
    setPanel((p) => cleanPanel({ ...p, [key]: value }));
  const load = (e) => {
    e.preventDefault();
    try {
      const id = parseMatchId(input);
      setSource({ id, mode: sourceMode, attempt: Date.now() });
      setTime(null);
      setError("");
      setNotice("");
    } catch (e) {
      setError(e.message);
    }
  };
  const url = match
    ? panelUrl(window.location.origin, match, panel, config, effectiveTime)
    : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice(
        "OBS URL copied. Toggle this Browser Source in OBS to show or hide the panel.",
      );
    } catch {
      setNotice("Select and copy the OBS URL below.");
    }
  };
  const exportPanel = () => {
    const blob = new Blob([JSON.stringify({ version: 1, panel }, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "deadlock-ar-stat-template.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  const importPanel = async (file) => {
    if (!file) return;
    try {
      if (file.size > 50000) throw Error();
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !data.panel) throw Error();
      setPanel(cleanPanel(data.panel));
      setNotice("Template imported.");
    } catch {
      setNotice("Choose a Deadlock AR stat-template JSON file under 50 KB.");
    }
  };
  return (
    <section className="stats-studio" hidden={!active}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A STORY IN EVERY NUMBER</span>
          <h1>
            Stat panels<span>✦</span>
          </h1>
          <p>Choose the numbers. Frame the moment. Put it on stream.</p>
        </div>
        <button className="button secondary" onClick={exportPanel}>
          Export template ↗
        </button>
      </div>
      <section className="stats-match-loader">
        <div>
          <span className="eyebrow">MATCH DATA</span>
          <h2>Connect your game</h2>
          <p>One match ID. All twelve players.</p>
        </div>
        <form onSubmit={load}>
          <Field label="Deadlock match ID">
            <input
              inputMode="numeric"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="120513539"
              maxLength={15}
            />
          </Field>
          <Field label="Data source">
            <select
              value={sourceMode}
              onChange={(e) => setSourceMode(e.target.value)}
            >
              <option value="finished">Finished match</option>
              <option value="live">Live match · beta</option>
            </select>
          </Field>
          <button type="submit" className="button primary" disabled={pending}>
            {pending
              ? "Connecting…"
              : sourceMode === "live"
                ? "Connect live match"
                : "Load match"}
          </button>
          {source?.mode === "live" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setSource(null);
                setNotice("Live connection stopped.");
              }}
            >
              Disconnect preview
            </button>
          )}
        </form>
        {(error || result.status === "error") && (
          <p className="stats-error" role="alert">
            {error || result.message}
          </p>
        )}
        <p className="stats-source-note">
          {sourceMode === "live"
            ? "Live beta needs a spectatable game. The source can be delayed; an inaccessible private lobby will show an error. No automatic reconnect loop."
            : "Finished matches use saved results. The timeline previews recorded samples, not live updates."}
        </p>
      </section>
      <div className="stats-template-heading">
        <div>
          <span className="eyebrow">TEMPLATE LIBRARY</span>
          <h2>Pick your panel</h2>
        </div>
        <label className="text-button stats-import">
          Import template
          <input
            type="file"
            className="hidden-input"
            accept="application/json,.json"
            onChange={(e) => {
              importPanel(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="stats-templates" aria-label="Stat templates">
        {Object.entries(METRICS).map(([key, metric], i) => (
          <button
            type="button"
            key={key}
            aria-pressed={panel.metric === key}
            className={`stats-template ${panel.metric === key ? "selected" : ""}`}
            onClick={() => {
              update("metric", key);
              update("title", "");
            }}
          >
            <span className="stats-template-number">
              0{i + 1}
              <i>{panel.metric === key ? "✓" : "↗"}</i>
            </span>
            <span
              className={`stats-template-art art-${key}`}
              aria-hidden="true"
            >
              {[70, 94, 53, 83, 44, 65].map((width, j) => (
                <span key={j}>
                  <b /> <i style={{ width: `${width}%` }} />
                </span>
              ))}
            </span>
            <strong>{metric.label}</strong>
            <small>
              {metric.live
                ? "Finished + live beta"
                : "Finished matches + recorded timeline"}
            </small>
          </button>
        ))}
      </div>
      <div className="stats-workbench">
        <section className="preview-panel stats-preview-panel">
          <div className="panel-toolbar">
            <div>
              <span className="eyebrow">BROADCAST PREVIEW</span>
              <FeedStatus result={result} stale={stale} />
            </div>
            <button
              className="button secondary"
              onClick={() => setShown((v) => !v)}
            >
              {shown ? "Hide preview" : "Show preview"}
            </button>
          </div>
          <div className="stats-preview-stage" ref={stage}>
            <div
              className="stats-preview-scaled"
              style={{ transform: `scale(${scale})` }}
            >
              <StatGraphic
                match={match}
                panel={panel}
                event={config.event}
                time={effectiveTime}
                status={result.status}
                stale={stale}
                visible={shown}
              />
            </div>
            {!match && (
              <div className="stats-empty-state">
                <span>✦</span>
                <h3>
                  {pending
                    ? "Fetching your match…"
                    : "Your next on-stream story"}
                </h3>
                <p>Load a match to preview real player statistics.</p>
              </div>
            )}
          </div>
          <footer className="preview-footer">
            <span>
              1920 × 1080 <b>·</b> Transparent OBS source
            </span>
            <span>{shown ? "PREVIEW VISIBLE" : "PREVIEW HIDDEN"}</span>
          </footer>
          {match?.mode === "finished" && (
            <div className="stats-timeline">
              <label htmlFor="stats-time">
                {effectiveTime >= match.duration
                  ? "Final statistics"
                  : "Recorded snapshot"}
                <strong>
                  {clock(effectiveTime)} / {clock(match.duration)}
                </strong>
              </label>
              <input
                id="stats-time"
                aria-label="Recorded match time"
                type="range"
                min="0"
                max={match.duration}
                step="1"
                value={effectiveTime}
                onChange={(e) => setTime(Number(e.target.value))}
              />
              <p>
                Damage and healing follow the latest available recorded sample.
                Buff pickups use their individual timestamps.
              </p>
              <button className="text-button" onClick={() => setTime(null)}>
                Return to final statistics ↗
              </button>
            </div>
          )}
        </section>
        <aside className="stats-controls settings-panel">
          <span className="eyebrow">PANEL APPEARANCE</span>
          <h2>Make it yours</h2>
          <Field label="Panel title">
            <input
              value={panel.title}
              placeholder={METRICS[panel.metric].label}
              maxLength={64}
              onChange={(e) => update("title", e.target.value)}
            />
          </Field>
          <Field label="Layout">
            <select
              value={panel.layout}
              onChange={(e) => update("layout", e.target.value)}
            >
              <option value="boxes">Player boxes · 4 × 3</option>
              <option value="teams">Two team columns</option>
              <option value="ranking">Compact leaderboard</option>
            </select>
          </Field>
          <div className="stats-control-pair">
            <Field label="Sort players">
              <select
                value={panel.sort}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="value">Highest value first</option>
                <option value="team">Team / player order</option>
              </select>
            </Field>
            <Field label="Theme">
              <select
                value={panel.theme}
                onChange={(e) => update("theme", e.target.value)}
              >
                <option value="parchment">Parchment</option>
                <option value="ink">Ink</option>
              </select>
            </Field>
          </div>
          <div className="stats-control-pair">
            <Field label="Position">
              <select
                value={panel.position}
                onChange={(e) => update("position", e.target.value)}
              >
                {[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "center",
                ].map((p) => (
                  <option key={p} value={p}>
                    {p.replace("-", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Panel size">
              <select
                value={panel.scale}
                onChange={(e) => update("scale", Number(e.target.value))}
              >
                <option value={0.8}>Small · 80%</option>
                <option value={1}>Medium · 100%</option>
                <option value={1.2}>Large · 120%</option>
              </select>
            </Field>
          </div>
          {[0, 1].map((i) => (
            <Field
              label={`${i === 0 ? "Amber" : "Sapphire"} team name`}
              key={i}
            >
              <input
                value={panel.teamNames[i]}
                maxLength={48}
                dir="auto"
                onChange={(e) =>
                  update(
                    "teamNames",
                    panel.teamNames.map((n, j) =>
                      j === i ? e.target.value : n,
                    ),
                  )
                }
              />
            </Field>
          ))}
          {unsupported && (
            <p className="stats-error">
              Live buff counts are not verified yet. Use a finished match for
              this template.
            </p>
          )}
        </aside>
      </div>
      {match && (
        <section className="stats-obs-panel">
          <div>
            <span className="eyebrow">READY FOR THE DIRECTOR</span>
            <h2>One OBS source per template.</h2>
            <p>
              Add this link as a 1920 × 1080 Browser Source. Show or hide it in
              OBS with the visibility button or a hotkey. Preview controls here
              affect this browser only.
            </p>
            <input
              aria-label="Stat panel OBS URL"
              value={url}
              readOnly
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="stats-obs-actions">
            <button
              className="button primary"
              disabled={unsupported}
              onClick={copy}
            >
              Copy panel OBS URL
            </button>
            <a
              className={`button secondary ${unsupported ? "disabled-link" : ""}`}
              href={unsupported ? undefined : url}
              target="_blank"
              rel="noreferrer"
              aria-disabled={unsupported}
            >
              Open panel ↗
            </a>
          </div>
        </section>
      )}
      {notice && (
        <p className="stats-notice" role="status">
          {notice}
        </p>
      )}
      {match && (
        <details className="stats-roster">
          <summary>
            Player display names{" "}
            <span>{players.length} players · optional overrides</span>
          </summary>
          <div>
            {players.map((p) => (
              <label key={p.id}>
                <HeroIcon
                  key={p.heroId}
                  heroId={p.heroId}
                  hero={heroRoster[p.heroId]}
                />
                <span>{heroRoster[p.heroId]?.name || `Hero ${p.heroId}`}</span>
                <input
                  aria-label={`Display name for ${heroRoster[p.heroId]?.name || p.slot}`}
                  placeholder={p.name || heroRoster[p.heroId]?.name}
                  value={panel.names[p.id] || ""}
                  maxLength={48}
                  dir="auto"
                  onChange={(e) => {
                    const names = { ...panel.names };
                    if (e.target.value) names[p.id] = e.target.value;
                    else delete names[p.id];
                    update("names", names);
                  }}
                />
              </label>
            ))}
          </div>
        </details>
      )}
      <p className="stats-footnote">
        Powered by Deadlock API · Statistics follow the source feed. Permanent
        buffs count permanent pickups only, across all levels; temporary
        power-ups are excluded.
      </p>
    </section>
  );
}
export function StatPanelOverlay() {
  const [linked] = useState(() => {
    try {
      return { ...readPanelUrl(window.location.href), error: "" };
    } catch (e) {
      return { error: e.message };
    }
  });
  const [source, setSource] = useState(() =>
    linked.error ? null : { id: linked.id, mode: linked.mode },
  );
  const result = useMatchStats(source),
    stale = useStaleFeed(result);
  const [stage, scale] = useStageScale();
  useEffect(() => {
    document.documentElement.classList.add("stats-broadcast-document");
    return () =>
      document.documentElement.classList.remove("stats-broadcast-document");
  }, []);
  const match = result.match;
  return (
    <main className="stats-overlay-page" ref={stage}>
      <div
        className="stats-overlay-scaled"
        style={{ transform: `scale(${scale})` }}
      >
        {match ? (
          <StatGraphic
            match={match}
            panel={linked.panel}
            event={linked.event}
            time={linked.time ?? match.duration}
            status={result.status}
            stale={stale}
          />
        ) : (
          <div className="stats-overlay-message">
            <h1>Deadlock AR · Stat panel</h1>
            <p>{linked.error || result.message}</p>
            {result.status === "error" && (
              <button
                onClick={() =>
                  setSource((s) => ({ ...s, attempt: Date.now() }))
                }
              >
                Retry connection
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
