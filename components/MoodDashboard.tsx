"use client";

import { useState, useEffect } from "react";

const MOOD_LABELS = ["", "Muy mal", "Mal", "Regular", "Bien", "Excelente"];
const MOOD_EMOJIS = ["", "😔", "😕", "😐", "🙂", "😄"];
const MOOD_COLORS = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];
const MOOD_TEXT   = ["", "text-red-600", "text-orange-600", "text-yellow-600", "text-green-600", "text-emerald-600"];
const MOOD_LIGHT  = ["", "bg-red-50", "bg-orange-50", "bg-yellow-50", "bg-green-50", "bg-emerald-50"];

function moodColor(avg: number) {
  if (avg >= 4.5) return "text-emerald-600";
  if (avg >= 3.5) return "text-green-600";
  if (avg >= 2.5) return "text-yellow-600";
  if (avg >= 1.5) return "text-orange-600";
  return "text-red-600";
}

function moodEmoji(avg: number) {
  if (avg >= 4.5) return "😄";
  if (avg >= 3.5) return "🙂";
  if (avg >= 2.5) return "😐";
  if (avg >= 1.5) return "😕";
  return "😔";
}

export default function MoodDashboard() {
  const [data, setData] = useState<{ fecha: string; avg: number; total: number; breakdown: number[] }[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/mood?dias=7")
      .then(r => r.json())
      .then(d => { setData(d.summary ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const today = data[0]; // most recent day
  const avgHoy = today?.avg ?? 0;
  const totalHoy = today?.total ?? 0;

  if (totalHoy === 0 && data.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Clima laboral</h2>
        <p className="text-xs text-zinc-400 mb-4">Últimos 7 días</p>
        <div className="text-center py-6 text-zinc-400 text-sm">
          <p className="text-3xl mb-2">😶</p>
          <p>Aún no hay registros de clima.</p>
          <p className="text-xs mt-1 text-zinc-300">Los empleados verán el widget en su portal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Clima laboral</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Últimos 7 días · {totalHoy} respuesta{totalHoy !== 1 ? "s" : ""} hoy</p>
        </div>
        {avgHoy > 0 && (
          <div className="text-right">
            <span className="text-2xl">{moodEmoji(avgHoy)}</span>
            <p className={`text-sm font-bold ${moodColor(avgHoy)}`}>{avgHoy.toFixed(1)}/5</p>
          </div>
        )}
      </div>

      {/* Breakdown de hoy */}
      {today && (
        <div className="flex gap-1.5 mb-4">
          {today.breakdown.map((count, i) => {
            const pct = totalHoy > 0 ? Math.round((count / totalHoy) * 100) : 0;
            if (count === 0) return null;
            return (
              <div key={i} className={`flex-1 rounded-lg p-2 text-center ${MOOD_LIGHT[i + 1]}`}>
                <p className="text-base leading-none">{MOOD_EMOJIS[i + 1]}</p>
                <p className={`text-xs font-bold mt-1 ${MOOD_TEXT[i + 1]}`}>{count}</p>
                <p className="text-[10px] text-zinc-400">{pct}%</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tendencia últimos días */}
      {data.length > 1 && (
        <div>
          <p className="text-xs text-zinc-400 mb-2">Tendencia</p>
          <div className="flex items-end gap-1 h-10">
            {[...data].reverse().map((d, i) => {
              const h = Math.round((d.avg / 5) * 40);
              const moodIdx = Math.round(d.avg);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${d.fecha}: ${d.avg.toFixed(1)}`}>
                  <div
                    className={`w-full rounded-sm ${MOOD_COLORS[moodIdx] ?? "bg-zinc-300"} transition-all`}
                    style={{ height: `${Math.max(h, 4)}px` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[10px] text-zinc-300">
              {new Date([...data].reverse()[0]?.fecha).toLocaleDateString("es-DO", { weekday: "short" })}
            </p>
            <p className="text-[10px] text-zinc-300">hoy</p>
          </div>
        </div>
      )}
    </div>
  );
}
