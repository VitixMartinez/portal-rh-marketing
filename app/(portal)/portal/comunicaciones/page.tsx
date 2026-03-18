"use client";

import { useState, useEffect } from "react";

interface Comunicacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  publicadoPorNombre: string | null;
  fijado: boolean;
  pdfUrl: string | null;
  fechaCaducidad: string;
  createdAt: string;
}

const TIPO_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  GENERAL:  { label: "General",  color: "text-blue-700",   bg: "bg-blue-50",   dot: "bg-blue-500"   },
  URGENTE:  { label: "Urgente",  color: "text-red-700",    bg: "bg-red-50",    dot: "bg-red-500"    },
  EVENTO:   { label: "Evento",   color: "text-green-700",  bg: "bg-green-50",  dot: "bg-green-500"  },
  POLITICA: { label: "Política", color: "text-purple-700", bg: "bg-purple-50", dot: "bg-purple-500" },
};

function ComunicacionCard({ c }: { c: Comunicacion }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TIPO_META[c.tipo] ?? TIPO_META.GENERAL;
  const vencida = new Date(c.fechaCaducidad) < new Date();
  const fecha = new Date(c.createdAt).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${c.fijado ? "border-l-4 border-l-amber-400 border-gray-100" : "border-gray-100"} ${vencida ? "opacity-70" : ""}`}>
      {/* Header — always visible, clickable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {c.fijado && (
                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              )}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </span>
              {c.pdfUrl && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  📄 PDF adjunto
                </span>
              )}
              {vencida && <span className="text-[10px] text-gray-400 italic">Vencida</span>}
              <span className="text-xs text-gray-400 ml-1">{fecha}</span>
            </div>
            <h3 className="font-semibold text-gray-900">{c.titulo}</h3>
            {!expanded && (
              <p className="text-xs text-gray-400 mt-0.5 truncate" dangerouslySetInnerHTML={{ __html: c.cuerpo.replace(/<[^>]*>/g, " ").trim() }} />
            )}
          </div>
          <svg className={`w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4 prose max-w-none text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: c.cuerpo }} />

          {/* PDF viewer */}
          {c.pdfUrl && (
            <div className="mt-5 rounded-xl overflow-hidden border border-gray-200">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  Documento adjunto
                </span>
                <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">
                  Abrir en nueva pestaña ↗
                </a>
              </div>
              <iframe src={c.pdfUrl} className="w-full" style={{ height: "700px" }} title={c.titulo} />
            </div>
          )}

          {c.publicadoPorNombre && (
            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
              Publicado por <span className="font-medium text-gray-600">{c.publicadoPorNombre}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortalComunicacionesPage() {
  const [lista, setLista] = useState<Comunicacion[]>([]);
  const [historial, setHistorial] = useState<Comunicacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [resActivas, resTodas] = await Promise.all([
          fetch("/api/comunicaciones"),
          fetch("/api/comunicaciones?incluirVencidas=true"),
        ]);
        const dataActivas = await resActivas.json();
        const dataTodas   = await resTodas.json();
        const activas: Comunicacion[] = dataActivas.comunicaciones ?? [];
        const todas: Comunicacion[]   = dataTodas.comunicaciones ?? [];
        setLista(activas);
        setHistorial(todas.filter(c => new Date(c.fechaCaducidad) < new Date()));
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comunicaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Anuncios y mensajes de la empresa</p>
      </div>

      {/* Vigentes */}
      {lista.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <p className="text-sm">No hay comunicaciones activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(c => <ComunicacionCard key={c.id} c={c} />)}
        </div>
      )}

      {/* Historial de vencidas */}
      {historial.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
          <div className="space-y-3">
            {historial.map(c => <ComunicacionCard key={c.id} c={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
