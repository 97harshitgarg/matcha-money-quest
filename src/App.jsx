import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const PIN_CODE = import.meta.env.VITE_DASH_PIN || "0803";
const API_URL = import.meta.env.VITE_EXPENSE_API_URL;
const API_KEY = import.meta.env.VITE_EXPENSE_API_KEY;
const SESSION_KEY = "mmq_unlocked_v1";

const MODES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "currentMonth", label: "Month" },
];

function currency(sym, n) {
  const x = Number(n) || 0;
  return `${sym}${x.toFixed(0)}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function computeXP(total, target) {
  const ratio = target > 0 ? total / target : 0.5;
  const score = clamp(1 - ratio, 0, 1);
  const xp = Math.floor(score * 1200 + 150);
  const level = clamp(Math.floor(xp / 250) + 1, 1, 10);
  const xpInLevel = xp % 250;
  return { score, xp, level, xpInLevel };
}

function PinLock({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  function submit() {
    if (pin === PIN_CODE) {
      setErr("");
      onUnlock();
      return;
    }
    setErr("Wrong PIN. Try again.");
    setPin("");
  }

  return (
    <div className="lockWrap">
      <motion.div
        className="lockCard"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <div className="lockBadge">Matcha Money Quest</div>
        <div className="lockTitle">A tiny finance cafe for Elishia + Harshit</div>
        <div className="lockSub">Enter PIN to step inside.</div>

        <div className="pinRow">
          <input
            className="pinInput"
            value={pin}
            onChange={(e) => {
              setErr("");
              setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4));
            }}
            inputMode="numeric"
            placeholder="4-digit PIN"
          />
          <button className="primaryBtn" onClick={submit}>Unlock</button>
        </div>

        <AnimatePresence>
          {err ? (
            <motion.div className="lockErr" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {err}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="lockHint">Hint: It’s your special date code.</div>

        <div className="latteArt">
          <motion.div
            className="steam"
            animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.3, repeat: Infinity }}
          />
          <motion.div
            className="steam steam2"
            animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.7, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function MiniTicker({ sym, byCategory }) {
  const rows = (byCategory || []).slice(0, 6);
  return (
    <div className="ticker">
      <div className="tickerTop">
        <span className="tickerTitle">Cafe Terminal</span>
        <span className="tickerTag">LIVE</span>
      </div>
      <div className="tickerBody">
        {rows.map((r) => (
          <div key={r.name} className="tickerRow">
            <span className="tickerSym">{r.name.toUpperCase().slice(0, 6)}</span>
            <span className="tickerPx">{currency(sym, r.value)}</span>
            <span className="tickerChg">{r.value > 0 ? "▲" : "•"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  // IMPORTANT: paste your own values here


  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  const [mode, setMode] = useState("currentMonth");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!unlocked) return;

    let cancelled = false;
    async function load() {
      setErr("");
      setData(null);

      const url = new URL(API_URL);
      url.searchParams.set("key", API_KEY);
      url.searchParams.set("mode", mode);

      try {
        const res = await fetch(url.toString());
        const json = await res.json();
        if (cancelled) return;
        if (!json.ok) {
          setErr(json.error || "Failed to load");
          return;
        }
        setData(json);
      } catch (e) {
        if (cancelled) return;
        setErr(String(e));
      }
    }
    load();

    return () => { cancelled = true; };
  }, [API_URL, API_KEY, mode, unlocked]);

  function unlockNow() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setUnlocked(true);
  }

  if (!unlocked) return <PinLock onUnlock={unlockNow} />;

  const sym = data?.currencySymbol || "₹";
  const total = Number(data?.totals?.total) || 0;

  const target =
    mode === "currentMonth" ? Number(data?.budget?.monthlyBudget || 60000) :
    mode === "week" ? 2000 * 7 :
    2000;

  const xp = computeXP(total, target);
  const title = useMemo(() => `Matcha Money Quest | ${data?.range?.label || ""}`, [data]);

  const byCategory = data?.breakdowns?.byCategory || [];
  const byPerson = data?.breakdowns?.byPerson || [];
  const byDay = data?.breakdowns?.byDay || [];

  return (
    <div className="page">
      <header className="header">
        <div className="brandRow">
          <div>
            <div className="brandPill">Matcha Cafe Finance</div>
            <h1>{title}</h1>
            <div className="sub">A cozy dashboard fed by your Telegram bot and Google Sheets.</div>
          </div>
          <MiniTicker sym={sym} byCategory={byCategory} />
        </div>

        <div className="tabs">
          {MODES.map((m) => (
            <button key={m.key} className={m.key === mode ? "tab active" : "tab"} onClick={() => setMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {err ? (
        <div className="card">
          <h2>Could not load</h2>
          <div className="muted">{err}</div>
          <div className="muted">Check your API URL, API key, and Apps Script deployment access.</div>
        </div>
      ) : !data ? (
        <div className="card">
          <div className="skeletonTitle" />
          <div className="skeletonLine" />
          <div className="skeletonLine" />
        </div>
      ) : (
        <>
          <div className="grid">
            <motion.div className="hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <div className="heroTop">
                <div className="heroTag">Today’s Matcha Tab</div>
                <div className="heroLevel">Level {xp.level}</div>
              </div>

              <div className="heroValue">{currency(sym, total)}</div>
              <div className="heroMeta">Target {currency(sym, target)} · Score {(xp.score * 100).toFixed(0)}%</div>

              <div className="barOuter">
                <motion.div className="barInner" initial={{ width: 0 }} animate={{ width: `${(xp.xpInLevel / 250) * 100}%` }} transition={{ duration: 0.7 }} />
              </div>
              <div className="muted">XP {xp.xpInLevel}/250</div>

              <div className="noteCard">
                <div className="noteTitle">Cafe Note</div>
                <div className="noteText">
                  The goal is calm money. Small wins count. If you go over, it’s just a new quest tomorrow.
                </div>
              </div>
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
              <h2>By person</h2>
              <ul className="list">
                {byPerson.map((x) => (
                  <li key={x.name} className="li">
                    <span>{x.name}</span>
                    <span className="bold">{currency(sym, x.value)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
              <h2>Categories</h2>
              <ul className="list">
                {byCategory.map((x) => (
                  <li key={x.name} className="li">
                    <span>{x.name}</span>
                    <span className="bold">{currency(sym, x.value)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
              <h2>Matcha tiles</h2>
              <div className="muted">Each tile is a day in this view.</div>
              <div className="dotGrid">
                {byDay.map((d) => {
                  const v = Number(d.value) || 0;
                  const intensity = clamp(v / Math.max(1, target / 10), 0, 1);
                  return (
                    <motion.div
                      key={d.day}
                      className="dot"
                      title={`${d.day}: ${currency(sym, v)}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25 }}
                      style={{ opacity: 0.25 + intensity * 0.75 }}
                    />
                  );
                })}
              </div>
            </motion.div>
          </div>

          <footer className="footer">
            <span className="muted">Made with matcha and spreadsheets.</span>
          </footer>
        </>
      )}
    </div>
  );
}
