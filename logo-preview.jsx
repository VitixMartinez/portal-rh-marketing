export default function LogoPreview() {
  const ShieldSolid = ({ size = 32, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L4 5.5V11c0 4.55 3.4 8.74 8 9.93C16.6 19.74 20 15.55 20 11V5.5L12 2z" />
    </svg>
  );

  const ShieldPeople = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64">
      {/* Shield outline */}
      <path d="M32 4L8 14v18c0 12 10.5 22.5 24 26 13.5-3.5 24-14 24-26V14L32 4z"
        fill="#1e40af" stroke="#1e3a8a" strokeWidth="1" />
      {/* 3 people */}
      <circle cx="32" cy="22" r="5" fill="#60a5fa"/>
      <path d="M22 38c0-5.5 4.5-8 10-8s10 2.5 10 8" fill="#60a5fa"/>
      <circle cx="20" cy="27" r="3.5" fill="#93c5fd"/>
      <path d="M13 40c0-4 3-6 7-6" fill="none" stroke="#93c5fd" strokeWidth="2"/>
      <circle cx="44" cy="27" r="3.5" fill="#93c5fd"/>
      <path d="M51 40c0-4-3-6-7-6" fill="none" stroke="#93c5fd" strokeWidth="2"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-10 font-sans">
      <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-10">
        Comparación de variantes del logo
      </p>

      <div className="flex gap-10 justify-center flex-wrap">

        {/* ── VARIANTE A: Escudo con personas (original) ── */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Original — con personas</p>

          {/* Sidebar preview */}
          <div className="w-[220px] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                <ShieldPeople size={36} />
              </div>
              <div className="pt-0.5">
                <div className="text-sm font-bold text-gray-900">Portal RH</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Gestión de Recursos Humanos</div>
              </div>
            </div>
            <div className="p-3 space-y-1">
              {["Inicio","Empleados","Nómina"].map((l,i) => (
                <div key={l} className={`px-3 py-2 rounded-lg text-sm font-medium ${i===1?"bg-blue-50 text-blue-700":"text-gray-500"}`}>{l}</div>
              ))}
            </div>
          </div>

          {/* Login header preview */}
          <div className="w-[220px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShieldPeople size={44} />
            </div>
            <p className="text-white font-bold text-lg">Portal RH</p>
            <p className="text-blue-100 text-xs mt-1">Toda la gestión de tu gente<br/>en un solo lugar</p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center">
          <div className="w-px h-64 bg-gray-200" />
        </div>

        {/* ── VARIANTE B: Escudo sólido azul ── */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Opción — escudo sólido</p>

          {/* Sidebar preview */}
          <div className="w-[220px] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldSolid size={22} className="text-white" />
              </div>
              <div className="pt-0.5">
                <div className="text-sm font-bold text-gray-900">Portal RH</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Gestión de Recursos Humanos</div>
              </div>
            </div>
            <div className="p-3 space-y-1">
              {["Inicio","Empleados","Nómina"].map((l,i) => (
                <div key={l} className={`px-3 py-2 rounded-lg text-sm font-medium ${i===1?"bg-blue-50 text-blue-700":"text-gray-500"}`}>{l}</div>
              ))}
            </div>
          </div>

          {/* Login header preview */}
          <div className="w-[220px] bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center">
              <ShieldSolid size={36} className="text-white" />
            </div>
            <p className="text-white font-bold text-lg">Portal RH</p>
            <p className="text-blue-100 text-xs mt-1">Toda la gestión de tu gente<br/>en un solo lugar</p>
          </div>
        </div>

      </div>

      <p className="text-center text-xs text-gray-400 mt-10">
        El escudo sólido se ve más limpio a tamaños pequeños (sidebar, favicon). El de personas tiene más carácter pero es más complejo.
      </p>
    </div>
  );
}
