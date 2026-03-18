"use client";

import { useRef, useEffect, useCallback } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899",
  "#FFFFFF",
];

export default function RichTextEditor({ value, onChange, placeholder = "Escribe el mensaje...", minHeight = 180 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value → editor (solo cuando cambia externamente)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalChange.current) { isInternalChange.current = false; return; }
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  }, [onChange]);

  const handleInput = () => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const ToolBtn = ({ cmd, val, title, children }: { cmd: string; val?: string; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      className="px-1.5 py-1 rounded hover:bg-gray-200 text-gray-700 transition-colors text-sm"
    >
      {children}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Bold / Italic / Underline */}
        <ToolBtn cmd="bold" title="Negrita (Ctrl+B)"><strong>B</strong></ToolBtn>
        <ToolBtn cmd="italic" title="Cursiva (Ctrl+I)"><em>I</em></ToolBtn>
        <ToolBtn cmd="underline" title="Subrayado (Ctrl+U)"><u>U</u></ToolBtn>
        <ToolBtn cmd="strikeThrough" title="Tachado"><s>S</s></ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Font size */}
        <select
          title="Tamaño de fuente"
          onChange={e => exec("fontSize", e.target.value)}
          defaultValue=""
          className="text-xs bg-transparent border border-gray-300 rounded px-1 py-0.5 cursor-pointer"
          onMouseDown={e => e.stopPropagation()}
        >
          <option value="" disabled>Tamaño</option>
          <option value="1">Pequeño</option>
          <option value="3">Normal</option>
          <option value="5">Grande</option>
          <option value="7">Muy grande</option>
        </select>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Text alignment */}
        <ToolBtn cmd="justifyLeft" title="Alinear izquierda">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
        </ToolBtn>
        <ToolBtn cmd="justifyCenter" title="Centrar">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm3 4h12v2H6v-2zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
        </ToolBtn>
        <ToolBtn cmd="justifyRight" title="Alinear derecha">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3V6zm6 4h12v2H9v-2zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
        </ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Lists */}
        <ToolBtn cmd="insertUnorderedList" title="Lista con viñetas">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2zM2 6.5a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2zm0 5a1 1 0 110-2 1 1 0 010 2z"/></svg>
        </ToolBtn>
        <ToolBtn cmd="insertOrderedList" title="Lista numerada">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-8v2h14V3H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
        </ToolBtn>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Color picker */}
        <div className="flex items-center gap-0.5" title="Color de texto">
          <span className="text-xs text-gray-500 mr-0.5">A</span>
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              title={c}
              onMouseDown={e => { e.preventDefault(); exec("foreColor", c); }}
              className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0 hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Highlight */}
        <div className="flex items-center gap-0.5" title="Resaltar texto">
          <span className="text-xs text-gray-500 mr-0.5">✦</span>
          {["#FEF08A","#BBF7D0","#BFDBFE","#FED7AA","#FBCFE8"].map(c => (
            <button
              key={c}
              type="button"
              title="Resaltar"
              onMouseDown={e => { e.preventDefault(); exec("hiliteColor", c); }}
              className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0 hover:scale-125 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <span className="w-px h-5 bg-gray-300 mx-1" />

        {/* Clear format */}
        <button
          type="button"
          title="Limpiar formato"
          onMouseDown={e => { e.preventDefault(); exec("removeFormat"); }}
          className="px-1.5 py-1 rounded hover:bg-gray-200 text-gray-500 text-xs transition-colors"
        >
          ✕ fmt
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="px-3 py-2.5 text-sm text-gray-800 outline-none overflow-auto prose max-w-none
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
      />
    </div>
  );
}
