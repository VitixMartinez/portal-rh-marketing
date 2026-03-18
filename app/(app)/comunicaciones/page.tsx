"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import RichTextEditor from "@/components/RichTextEditor";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Comunicacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: "GENERAL" | "URGENTE" | "EVENTO" | "POLITICA";
  publicadoPorNombre: string | null;
  duracionDias: number;
  fechaCaducidad: string;
  fijado: boolean;
  pdfUrl: string | null;
  createdAt: string;
}

const TIPOS = ["GENERAL", "URGENTE", "EVENTO", "POLITICA"] as const;

const TIPO_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  GENERAL:  { label: "General",  color: "text-blue-700",  bg: "bg-blue-50",  dot: "bg-blue-500"  },
  URGENTE:  { label: "Urgente",  color: "text-red-700",   bg: "bg-red-50",   dot: "bg-red-500"   },
  EVENTO:   { label: "Evento",   color: "text-green-700", bg: "bg-green-50", dot: "bg-green-500" },
  POLITICA: { label: "Política", color: "text-purple-700",bg: "bg-purple-50",dot: "bg-purple-500"},
};

interface Toast { id: number; msg: string; ok: boolean }

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ComunicacionesPage() {
  const [lista, setLista]             = useState<Comunicacion[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filtroTipo, setFiltroTipo]   = useState<string>("TODOS");
  const [incluirVenc, setIncluirVenc] = useState(false);

  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState<Comunicacion | null>(null);

  /* form */
  const [titulo, setTitulo]   = useState("");
  const [cuerpo, setCuerpo]   = useState("");
  const [tipo, setTipo]       = useState<string>("GENERAL");
  const [duracion, setDuracion] = useState(7);
  const [fijado, setFijado]   = useState(false);
  const [pdfUrl, setPdfUrl]   = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* detail */
  const [detalle, setDetalle] = useState<Comunicacion | null>(null);

  /* toasts */
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((msg: string, ok = true) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, ok }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (incluirVenc) p.set("incluirVencidas", "true");
      if (filtroTipo !== "TODOS") p.set("tipo", filtroTipo);
      const res = await fetch(`/api/comunicaciones?${p}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLista(data.comunicaciones ?? []);
    } catch { addToast("Error al cargar", false); }
    finally { setLoading(false); }
  }, [filtroTipo, incluirVenc, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Open modal ── */
  const openNew = () => {
    setEditing(null);
    setTitulo(""); setCuerpo(""); setTipo("GENERAL");
    setDuracion(7); setFijado(false); setPdfUrl(null); setPdfName("");
    setModal(true);
  };

  const openEdit = (c: Comunicacion) => {
    setEditing(c);
    setTitulo(c.titulo); setCuerpo(c.cuerpo); setTipo(c.tipo);
    setDuracion(c.duracionDias); setFijado(c.fijado);
    setPdfUrl(c.pdfUrl ?? null); setPdfName(c.pdfUrl ? "PDF adjunto" : "");
    setModal(true);
  };

  /* ── PDF upload ── */
  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { addToast("Solo se permiten PDFs", false); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/comunicaciones/upload-pdf", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const { url } = await res.json();
      setPdfUrl(url);
      setPdfName(file.name);
      addToast("PDF subido correctamente");
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al subir PDF", false);
    } finally { setUploading(false); }
  };

  /* ── Save ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !cuerpo.trim()) return;
    setGuardando(true);
    try {
      const payload = { titulo: titulo.trim(), cuerpo, tipo, duracionDias: duracion, fijado, pdfUrl };
      const res = editing
        ? await fetch(`/api/comunicaciones/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/comunicaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      addToast(editing ? "Actualizada" : "Publicada");
      setModal(false);
      fetchData();
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : "Error al guardar", false);
    } finally { setGuardando(false); }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta comunicación?")) return;
    try {
      const res = await fetch(`/api/comunicaciones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      addToast("Eliminada");
      setDetalle(null);
      fetchData();
    } catch { addToast("Error al eliminar", false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
  const isExpired = (d: string) => new Date(d) < new Date();

  /* ─── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comunicaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Anuncios y mensajes para toda la empresa</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nueva comunicación
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {["TODOS", ...TIPOS].map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filtroTipo === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t === "TODOS" ? "Todos" : TIPO_META[t].label}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={incluirVenc} onChange={e => setIncluirVenc(e.target.checked)} className="rounded" />
          Incluir vencidas
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          <p className="text-sm">No hay comunicaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(c => {
            const meta = TIPO_META[c.tipo] ?? TIPO_META.GENERAL;
            const vencida = isExpired(c.fechaCaducidad);
            return (
              <div key={c.id} onClick={() => setDetalle(c)}
                className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${vencida ? "opacity-60" : "border-gray-200"} ${c.fijado ? "border-l-4 border-l-amber-400" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {c.fijado && <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                      </span>
                      {c.pdfUrl && <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">📄 PDF</span>}
                      {vencida && <span className="text-xs text-gray-400 italic">Vencida</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{c.titulo}</h3>
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1" dangerouslySetInnerHTML={{ __html: c.cuerpo.replace(/<[^>]*>/g, " ").trim() }} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">{fmt(c.createdAt)}</p>
                    {c.publicadoPorNombre && <p className="text-xs text-gray-400 mt-0.5">{c.publicadoPorNombre}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail Modal ── */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                {detalle.fijado && <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${TIPO_META[detalle.tipo]?.bg} ${TIPO_META[detalle.tipo]?.color}`}>
                  {TIPO_META[detalle.tipo]?.label}
                </span>
              </div>
              <button onClick={() => setDetalle(null)} className="text-gray-400 hover:text-gray-700 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{detalle.titulo}</h2>
              {/* Rich HTML content */}
              <div className="prose max-w-none text-sm text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: detalle.cuerpo }} />
              {/* PDF viewer */}
              {detalle.pdfUrl && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                      Documento adjunto
                    </span>
                    <a href={detalle.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Abrir en nueva pestaña ↗</a>
                  </div>
                  <iframe src={detalle.pdfUrl} className="w-full" style={{ height: "600px" }} title="PDF" />
                </div>
              )}
              <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div><span className="font-semibold text-gray-700 block mb-0.5">Publicado por</span>{detalle.publicadoPorNombre ?? "—"}</div>
                <div><span className="font-semibold text-gray-700 block mb-0.5">Fecha</span>{fmt(detalle.createdAt)}</div>
                <div><span className="font-semibold text-gray-700 block mb-0.5">Vigencia</span>{detalle.duracionDias} día{detalle.duracionDias !== 1 ? "s" : ""}</div>
                <div><span className="font-semibold text-gray-700 block mb-0.5">Vence</span>
                  <span className={isExpired(detalle.fechaCaducidad) ? "text-red-500 font-semibold" : ""}>{fmt(detalle.fechaCaducidad)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
              <button onClick={() => { setDetalle(null); openEdit(detalle); }} className="px-4 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Editar</button>
              <button onClick={() => handleDelete(detalle.id)} className="px-4 py-1.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Editar comunicación" : "Nueva comunicación"}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-700 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Título <span className="text-red-500">*</span></label>
                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120}
                  placeholder="Ej. Reunión de equipo – viernes 10am"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIPOS.map(t => (
                    <button key={t} type="button" onClick={() => setTipo(t)}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${tipo === t ? `${TIPO_META[t].bg} ${TIPO_META[t].color} ring-2 ring-offset-1 ring-current` : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                      {TIPO_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cuerpo — rich text */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mensaje <span className="text-red-500">*</span></label>
                <RichTextEditor value={cuerpo} onChange={setCuerpo} minHeight={200} />
              </div>

              {/* PDF upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Adjuntar PDF (opcional)</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    {uploading
                      ? <><div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Subiendo...</>
                      : <><svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg> Subir PDF</>
                    }
                  </button>
                  {pdfUrl && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {pdfName || "PDF adjunto"}
                      <button type="button" onClick={() => { setPdfUrl(null); setPdfName(""); }} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdf} />
              </div>

              {/* Duración + Fijado */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duración (días)</label>
                  <input type="number" min={1} max={365} value={duracion} onChange={e => setDuracion(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mt-5 select-none">
                  <input type="checkbox" checked={fijado} onChange={e => setFijado(e.target.checked)} className="rounded w-4 h-4 accent-amber-500" />
                  <span className="font-medium">Fijar en top</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" disabled={guardando || uploading}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {guardando ? "Guardando…" : editing ? "Guardar cambios" : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[100]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white ${t.ok ? "bg-green-600" : "bg-red-600"}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
