"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

type Pregunta = { id: string; texto: string; requerida: boolean };
type Vacante = {
  id: string; titulo: string; descripcion: string | null;
  requisitos: string | null; ubicacion: string | null;
  tipo: string; preguntas: Pregunta[]; empresa: string;
};

const TIPO_LABEL: Record<string, string> = {
  TIEMPO_COMPLETO: "Tiempo completo",
  MEDIO_TIEMPO:    "Medio tiempo",
  TEMPORAL:        "Temporal",
  CONTRATO:        "Contrato",
};

export default function PublicApplyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [vacante, setVacante]   = useState<Vacante | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [telefono, setTelefono] = useState("");
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [cvUrl,    setCvUrl]    = useState("");
  const [cvNombre, setCvNombre] = useState("");
  const [archivos, setArchivos] = useState<{ nombre: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cvRef  = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/apply/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setVacante(data);
      })
      .catch(() => setError("Error al cargar la vacante"))
      .finally(() => setLoading(false));
  }, [slug]);

  async function uploadFile(file: File, context: string): Promise<{ url: string; nombre: string } | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("context", context);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json();
      alert(j.error ?? "Error al subir archivo");
      return null;
    }
    return res.json();
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFile(file, "apply");
    setUploading(false);
    if (result) { setCvUrl(result.url); setCvNombre(file.name); }
  }

  async function handleExtraUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadFile(file, "apply");
    setUploading(false);
    if (result) setArchivos(p => [...p, { nombre: file.name, url: result.url }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vacante) return;

    // Check required questions
    for (const p of vacante.preguntas) {
      if (p.requerida && !respuestas[p.id]?.trim()) {
        alert(`La pregunta "${p.texto}" es requerida`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/apply/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono, respuestas, cvUrl: cvUrl || null, archivos }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Error al enviar"); return; }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">😔</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Vacante no disponible</h1>
        <p className="text-gray-500 dark:text-zinc-400">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Aplicación enviada!</h1>
        <p className="text-gray-500 dark:text-zinc-400">Tu aplicación para <strong>{vacante?.titulo}</strong> fue recibida exitosamente. El equipo de RH se pondrá en contacto contigo.</p>
      </div>
    </div>
  );

  if (!vacante) return null;

  const inp = "w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1";

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {vacante.empresa.charAt(0) || "R"}
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">{vacante.empresa}</p>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{vacante.titulo}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                {vacante.ubicacion && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
                    📍 {vacante.ubicacion}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
                  {TIPO_LABEL[vacante.tipo] ?? vacante.tipo}
                </span>
              </div>
            </div>
          </div>

          {vacante.descripcion && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <p className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{vacante.descripcion}</p>
            </div>
          )}
          {vacante.requisitos && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1">Requisitos</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">{vacante.requisitos}</p>
            </div>
          )}
        </div>

        {/* Application form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Tu información</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nombre completo *</label>
              <input required value={nombre} onChange={e => setNombre(e.target.value)} className={inp} placeholder="Juan Pérez" />
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} placeholder="juan@email.com" />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} className={inp} placeholder="809-000-0000" />
            </div>
          </div>

          {/* CV upload */}
          <div>
            <label className={lbl}>Currículum Vitae (PDF, DOC, DOCX)</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => cvRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 px-4 py-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition w-full text-left">
                {cvNombre || (uploading ? "Subiendo..." : "📎 Haz clic para adjuntar CV")}
              </button>
              {cvNombre && (
                <button type="button" onClick={() => { setCvUrl(""); setCvNombre(""); }}
                  className="text-red-400 hover:text-red-500 text-xs">✕</button>
              )}
            </div>
            <input ref={cvRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCvUpload} />
          </div>

          {/* Additional files */}
          <div>
            <label className={lbl}>Otros archivos (certificados, cartas de recomendación, etc.)</label>
            <div className="space-y-2">
              {archivos.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-800 rounded-lg px-3 py-2">
                  <span className="flex-1 truncate">📄 {a.nombre}</span>
                  <button type="button" onClick={() => setArchivos(p => p.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-500 flex-shrink-0">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addRef.current?.click()}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                + Agregar archivo
              </button>
            </div>
            <input ref={addRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleExtraUpload} />
          </div>

          {/* Custom questions */}
          {vacante.preguntas.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Preguntas de la posición</h2>
              {vacante.preguntas.map(p => (
                <div key={p.id}>
                  <label className={lbl}>
                    {p.texto} {p.requerida && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={respuestas[p.id] ?? ""}
                    onChange={e => setRespuestas(r => ({ ...r, [p.id]: e.target.value }))}
                    className={inp + " resize-none"}
                    rows={3}
                    placeholder="Tu respuesta..."
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={submitting || uploading}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition shadow-sm disabled:opacity-50">
              {submitting ? "Enviando..." : "Enviar aplicación"}
            </button>
            <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-3">
              Tu información será tratada con confidencialidad por el equipo de RH.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
