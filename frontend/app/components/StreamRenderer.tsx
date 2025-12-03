// app/components/StreamRenderer.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { connectWS } from "../../utils/socket";
import ResultChart from "./ResultChart";
import styles from "./streamrenderer.module.css";

type Factor = {
  rank: number;
  name: string;
  effect_short: string;
  direction: "increases" | "slightly_increases" | "decreases" | string;
};

export default function StreamRenderer({ jobId }: { jobId: string }) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [isTypingId, setIsTypingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // 🔊 speaking indicator
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🌙 / 🌞 theme state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // WebSocket: receive factors stream
  useEffect(() => {
    if (!jobId) return;

    let disconnect = () => {};
    try {
      disconnect = connectWS(jobId, (msg) => {
        try {
          if (msg.type === "partial") {
            const f = msg.data as Factor;
            const id = `${f.name}_${f.rank}`;
            setIsTypingId(id);

            setFactors((prev) => {
              if (prev.some((p) => p.rank === f.rank && p.name === f.name)) return prev;
              return [...prev, f].sort((a, b) => a.rank - b.rank);
            });
          }
          if (msg.type === "final") {
            const arr = msg.data as Factor[];
            setFactors([...arr].sort((a, b) => a.rank - b.rank));
            setIsTypingId(null);
          }
        } catch {
          setError("Invalid WS message from server.");
        }
      });
    } catch {
      setError("Failed to connect to WebSocket.");
    }

    return () => {
      try {
        disconnect();
      } catch {}
    };
  }, [jobId]);

  // Theme load
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const defaultTheme: "dark" | "light" = prefersDark ? "dark" : "light";
    setTheme(defaultTheme);
    document.documentElement.setAttribute("data-theme", defaultTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const toggleExpand = async (factor: Factor) => {
    const id = `${factor.name}_${factor.rank}`;

    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    if (!explanations[id]) {
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
        const res = await fetch(`${API_BASE}/api/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item: factor.name }),
        });
        const data = await res.json();
        setExplanations((p) => ({ ...p, [id]: data?.explanation || "" }));
      } catch {
        setExplanations((p) => ({ ...p, [id]: "" }));
      }
    }
    setExpandedId(id);
  };

  const buildExplanation = (factor: Factor, raw?: string) => {
    const meaning =
      raw?.trim() || `${factor.name} influences the ${factor.effect_short.toLowerCase()} of this item.`;
    const why = `Higher ${factor.name.toLowerCase()} improves ${factor.effect_short.toLowerCase()}.`;

    let impact = "";
    if (factor.direction === "increases") impact = "Increasing this factor strongly boosts efficiency and performance.";
    else if (factor.direction === "slightly_increases") impact = "Increasing this factor gives a small but noticeable improvement in efficiency.";
    else if (factor.direction === "decreases") impact = "Increasing this factor reduces efficiency in many cases.";
    else impact = "This factor has a neutral effect on efficiency.";

    return `
What it means:
${meaning}

Why it matters:
${why}

Impact on efficiency:
${impact}
`;
  };

  // 🔊 TTS
  const speakExplanation = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // 🛑 Stop speaking
  const stopSpeaking = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const chartData = useMemo(() => {
    if (!factors.length) return [];
    const maxRank = Math.max(...factors.map((f) => f.rank));
    return factors.map((f) => ({
      name: f.name,
      score: Math.max(1, maxRank + 1 - f.rank),
      rank: f.rank,
    }));
  }, [factors]);

  // Price-to-Performance
  const priceToPerformance = useMemo(() => {
    const priceFactor = factors.find(
      (f) => f.name.toLowerCase() === "price" || f.effect_short.toLowerCase().includes("₹")
    );
    if (!priceFactor) return null;

    const digits = priceFactor.effect_short.replace(/[^0-9]/g, "");
    if (!digits) return null;

    const price = Number(digits);
    if (!price) return null;

    const totalPerformance = chartData.reduce((sum, d) => sum + d.score, 0);
    const score = Math.min(10, Math.max(0, (totalPerformance / price) * 1000));
    const finalScore = Number(score.toFixed(1));

    let verdict = "";
    if (finalScore >= 8) verdict = "🔥 Excellent Value";
    else if (finalScore >= 6) verdict = "👍 Good Value";
    else if (finalScore >= 4) verdict = "🙂 Average";
    else if (finalScore >= 2) verdict = "⚠️ Low Value";
    else verdict = "❌ Poor Value";

    return { price: price.toLocaleString("en-IN"), score: finalScore, verdict };
  }, [factors, chartData]);

  const recommendations = useMemo(() => {
    if (!factors.length) return null;
    const sorted = [...factors].sort((a, b) => a.rank - b.rank);
    const positives = sorted.filter(
      (f) => f.direction === "increases" || f.direction === "slightly_increases"
    );
    const negatives = sorted.filter((f) => f.direction === "decreases");

    return {
      mainFocus: positives.slice(0, 2),
      watchNext: positives.slice(2, 4),
      avoid: negatives.slice(0, 1),
    };
  }, [factors]);

  if (!factors.length && !error) {
    return (
      <div className={styles.container}>
        <div className={styles.headerCard}>
          <h3 className="font-semibold text-white">Top Factors</h3>
          <p className="text-sm text-white/70">Waiting for results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* THEME BUTTON */}
      <button className={styles.themeToggle} onClick={toggleTheme}>
        {theme === "dark" ? "🌞 Light Mode" : "🌙 Dark Mode"}
      </button>

      <div className={styles.headerCard}>
        <h3 className="font-semibold text-white">Top Factors</h3>
        <p className="text-sm text-white/70">Click a row to see AI explanation.</p>
      </div>

      {/* TABLE */}
      <div className={styles.glassCard}>
        <table className={styles.premiumTable}>
          <thead>
            <tr>
              <th className={styles.th}>Rank</th>
              <th className={styles.th}>Factor</th>
              <th className={styles.th}>Definition</th>
              <th className={`${styles.th} ${styles.thEfficiency}`}>Efficiency</th>
            </tr>
          </thead>

          <tbody>
            {factors.map((f) => {
              const id = `${f.name}_${f.rank}`;
              const isTyping = isTypingId === id;
              let pillClass = styles.pillIncrease;
              let pillLabel = "Increases";
              let pillIcon = "⬆️";

              if (f.direction === "slightly_increases") {
                pillClass = styles.pillSlight;
                pillLabel = "Slightly Increases";
                pillIcon = "↗️";
              }
              if (f.direction === "decreases") {
                pillClass = styles.pillDecrease;
                pillLabel = "Decreases";
                pillIcon = "⬇️";
              }

              const explanation = buildExplanation(f, explanations[id]);

              return (
                <React.Fragment key={id}>
                  <tr className={styles.row} onClick={() => toggleExpand(f)}>
                    <td className={styles.tdRank}>
                      <span className={styles.rankChip}>{f.rank}</span>
                    </td>
                    <td className={styles.tdName}>
                      {f.name}
                      {isTyping && (
                        <span className={styles.typingDots}>
                          <span>.</span><span>.</span><span>.</span>
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>{f.effect_short}</td>
                    <td className={styles.tdEfficiency}>
                      <span className={`${styles.efficiencyPill} ${pillClass}`}>
                        <span className={styles.pillIcon}>{pillIcon}</span>
                        {pillLabel}
                      </span>
                    </td>
                  </tr>

                  {expandedId === id && (
                    <tr>
                      <td colSpan={4}>
                        <div className={styles.expandBox}>
                          <div className={styles.expandBoxHeader}>
                            <div className={styles.expandBoxTitle}>Explanation</div>

                            <div className={styles.ttsGroup}>
                              {isSpeaking && (
                                <div className={styles.wave}>
                                  <span></span><span></span><span></span><span></span>
                                </div>
                              )}
                              <button
                                className={styles.ttsBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speakExplanation(explanation);
                                }}
                              >
                                🔊 Listen
                              </button>
                              <button
                                className={styles.ttsBtnStop}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  stopSpeaking();
                                }}
                              >
                                ⛔ Stop
                              </button>
                            </div>
                          </div>

                          <pre className={styles.explanationText}>{explanation}</pre>

                          {/* SINGLE FACTOR RECOMMENDATION */}
                          <div className={styles.singleRecoBox}>
                            <div className={styles.singleRecoTitle}>Recommendation</div>
                            <p className={styles.singleRecoText}>
                              {f.direction === "increases" &&
                                `Boost ${f.name} whenever possible to improve ${f.effect_short}.`}
                              {f.direction === "slightly_increases" &&
                                `Improving ${f.name} gives small but meaningful benefits in ${f.effect_short}.`}
                              {f.direction === "decreases" &&
                                `Keep ${f.name} low to avoid reducing ${f.effect_short} and overall efficiency.`}
                              {!["increases","slightly_increases","decreases"].includes(f.direction) &&
                                `Maintain ${f.name} at normal levels — it has a neutral effect on efficiency.`}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* GRAPH + RECOMMENDATIONS + PRICE/PERFORMANCE */}
      <div className={styles.chartSection}>
        <div className={styles.glassCard}>
          <h4 className="mb-2 font-semibold text-white">Importance</h4>
          <p className="mb-4 text-sm text-white/70">Bar width reflects relative importance derived from rank.</p>

          <ResultChart data={chartData} />

          {/* Global Recommendations */}
          {recommendations && (
            <div className={styles.recoBox}>
              <div className={styles.recoHeader}>
                <span className={styles.recoTitle}>AI Recommendations</span>
                <span className={styles.recoBadge}>Beta</span>
              </div>

              <div className={styles.recoGroup}>
                <div className={styles.recoLabel}>Focus on first:</div>
                <ul>
                  {recommendations.mainFocus.length === 0 ? (
                    <li className={styles.recoItemMuted}>No strong positive factors detected yet.</li>
                  ) : (
                    recommendations.mainFocus.map((f) => (
                      <li key={f.rank} className={styles.recoItem}>
                        <span className={styles.recoChip}>#{f.rank}</span>
                        <span className={styles.recoText}>
                          Boost <strong>{f.name}</strong> to improve{" "}
                          <span className={styles.recoHighlight}>{f.effect_short}</span>.
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {recommendations.watchNext.length > 0 && (
                <div className={styles.recoGroup}>
                  <div className={styles.recoLabel}>Also keep an eye on:</div>
                  <ul>
                    {recommendations.watchNext.map((f) => (
                      <li key={f.rank} className={styles.recoItem}>
                        <span className={styles.recoChipLight}>#{f.rank}</span>
                        <span className={styles.recoText}>
                          <strong>{f.name}</strong> adds extra stability to{" "}
                          <span className={styles.recoHighlight}>{f.effect_short}</span>.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendations.avoid.length > 0 && (
                <div className={styles.recoGroup}>
                  <div className={styles.recoLabelWarn}>Watch out for:</div>
                  <ul>
                    {recommendations.avoid.map((f) => (
                      <li key={f.rank} className={styles.recoItemWarn}>
                        <span className={styles.recoChipWarn}>#{f.rank}</span>
                        <span className={styles.recoText}>
                          High <strong>{f.name}</strong> can{" "}
                          <span className={styles.recoHighlightWarn}>reduce efficiency</span>. Try to control or optimize it.
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* P2P SCORE */}
          {priceToPerformance && (
            <div className={styles.p2pBox}>
              <div className={styles.p2pTitle}>💰 Price-to-Performance Score</div>
              <div className={styles.p2pScore}>{priceToPerformance.score} / 10</div>
              <div className={styles.p2pVerdict}>{priceToPerformance.verdict}</div>
              <div className={styles.p2pPriceLabel}>Price considered: ₹{priceToPerformance.price}</div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="mt-3 text-red-400">{error}</div>}
    </div>
  );
}
