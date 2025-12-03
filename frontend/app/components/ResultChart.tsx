// app/components/ResultChart.tsx
"use client";

import React, { useEffect, useRef } from "react";

type DataPoint = { name: string; score: number; rank: number };

export default function ResultChart({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0)
    return <div className="text-white/60">No chart data</div>;

  const max = Math.max(...data.map((d) => d.score));
  const normalized = data.map((d) => ({
    ...d,
    value: Math.round((d.score / max) * 100),
  }));

  // Dynamic label width based on longest text
  const longest = Math.max(...data.map((d) => d.name.length));
  const labelWidth = Math.min(260, 120 + longest * 6);

  const barHeight = 18;
  const gap = 14;
  const chartWidth = 600 - labelWidth - 40;
  const height = normalized.length * (barHeight + gap) + 40;
  const width = 600;

  return (
    <div className="relative overflow-visible">
      {/* FLOATING NEON PARTICLES */}
      <div className="pointer-events-none particle-container">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMinYMid"
      >
        {/* BAR GRADIENT */}
        <defs>
          <linearGradient id="barGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#60f0d8" />
            <stop offset="100%" stopColor="#2ea7ff" />
          </linearGradient>

          {/* Soft Glow Filter */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <style>{`
          .label {
            font: 13px system-ui;
            fill: #ffffff;
            font-weight: 600;
          }
          .rank {
            font: 12px system-ui;
            fill: #9aa9bf;
          }
          .value {
            font: 12px system-ui;
            fill: #9aa9bf;
          }

          /* Bar Animate */
          .bar {
            animation: growBar 0.9s ease forwards;
            transform-origin: left;
            transform: scaleX(0);
          }

          @keyframes growBar {
            to { transform: scaleX(1); }
          }

          /* Label Slide */
          .label, .rank {
            opacity: 0;
            animation: fadeSlide 0.75s ease forwards;
          }

          @keyframes fadeSlide {
            from { opacity: 0; transform: translateX(-14px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>

        {normalized.map((d, i) => {
          const y = i * (barHeight + gap) + 24;
          const barWidth = Math.max(8, (chartWidth * d.value) / 100);

          return (
            <g key={d.name}>
              <text x={8} y={y + 12} className="rank">
                #{d.rank}
              </text>

              <text x={40} y={y + 12} className="label">
                {d.name}
              </text>

              <rect
                x={labelWidth}
                y={y}
                rx={8}
                width={barWidth}
                height={barHeight}
                fill="url(#barGradient)"
                className="bar"
                filter="url(#softGlow)"
              />

              <text
                x={labelWidth + barWidth + 12}
                y={y + 12}
                className="value"
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
