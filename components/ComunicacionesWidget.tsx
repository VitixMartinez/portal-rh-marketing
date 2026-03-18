"use client";

import { useState } from "react";

interface Comunicacion {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  publicadoPorNombre: string | null;
  fijado: boolean;
  pdfUrl?: string | null;
  createdAt: string | Date;
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
  const fecha = new Date(c.createdAt).toLocaleDateString("es-DO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={`cursor-pointer transition-colors ${c.fijado ? "border-l-4 border-l-amber-400" : ""}`}
      onClick={() => setExpanded(e => !e)}>
      <div className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50">
        {c.fijado && (
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
            </span>
            {c.pdfUrl && (
              <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">📄 PDF</span>
            )}
            <span className="text-xs text-gray-400">{fecha}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm">{c.titulo}</p>
            <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {!expanded && (
            <p className="text-xs text-gray-400 mt-0.5 truncate"
              dangerouslySetInnerHTML={{ __html: c.cuerpo.replace(/<[^>]*>/g, " ").trim() }} />
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100" onClick={e => e.stopPropagation()}>
          <div className="pt-3 prose max-w-none text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: c.cuerpo }} />

          {c.pdfUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  Documento adjunto
                </span>
                <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium">
                  Abrir en nueva pestaña ↗
                </a>
              </div>
              <iframe src={c.pdfUrl} className="w-full" style={{ height: "600px" }} title={c.titulo} />
            </div>
          )}

          {c.publicadoPorNombre && (
            <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
              — <span className="font-medium text-gray-600">{c.publicadoPorNombre}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComunicacionesWidget({ comunicaciones }: { comunicaciones: Comunicacion[] }) {
  if (!comunicaciones.length) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
        <h2 className="font-semibold text-gray-800">Comunicaciones</h2>
        <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
          {comunicaciones.length}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {comunicaciones.map(c => <ComunicacionCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}
