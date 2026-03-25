"use client";

import { useState, useEffect } from "react";

const MOODS = [
  { value: 1, emoji: "😔", label: "Muy mal",   color: "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" },
  { value: 2, emoji: "😕", label: "Mal",        color: "bg-orange-100 border-orange-300 text-orange-700 hover:bg-orange-200" },
  { value: 3, emoji: "😐", label: "Regular",    color: "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200" },
  { value: 4, emoji: "🙂", label: "Bien",        color: "bg-green-100 border-green-300 text-green-700 hover:bg-green-200" },
  { value: 5, emoji: "😄", label: "Excelente",  color: "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200" },
];

export default function MoodWidget() {
  const [entry, setEntry]     = useState<{ mood: number; nota?: string } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [nota, setNota]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    fetch("/api/mood")
      .then(r => r.json())
      .then(d => {
        if (d.entry) {
          setEntry(d.entry);
          setSelected(d.entry.mood);
          setNota(d.entry.nota ?? "");
          setDone(true);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: selected, nota: nota || null }),
    });
    setSaving(false);
    setDone(true);
    setEntry({ mood: selected, nota });
  }

  if (!loaded) return null;

  const selectedMood = MOODS.find(m => m.value === selected);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">¿Cómo te sientes hoy?</p>
          <p className="text-xs text-gray-400 mt-0.5">Tu respuesta es confidencial</p>
        </div>
        {done && selectedMood && (
          <span className="text-2xl">{selectedMood.emoji}</span>
        )}
      </div>

      {/* Mood buttons */}
      <div className="flex gap-2 mb-3">
        {MOODS.map(m => (
          <button
            key={m.value}
            onClick={() => { setSelected(m.value); setDone(false); }}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all
              ${selected === m.value
                ? m.color + " scale-105 shadow-sm border-2"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-500"
              }`}
          >
            <span className="text-xl leading-none">{m.emoji}</span>
            <span className="text-[10px] font-medium leading-tight">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Optional note */}
      {selected && !done && (
        <div className="space-y-2">
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Añade un comentario (opcional)"
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            maxLength={200}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      )}

      {done && entry && (
        <div className="flex items-center justify-between">
          {entry.nota ? (
            <p className="text-xs text-gray-400 italic">"{entry.nota}"</p>
          ) : (
            <p className="text-xs text-gray-400">Registrado hoy ✓</p>
          )}
          <button
            onClick={() => setDone(false)}
            className="text-xs text-blue-600 hover:underline ml-2"
          >
            Cambiar
          </button>
        </div>
      )}
    </div>
  );
}
