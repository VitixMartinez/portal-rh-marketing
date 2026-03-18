export default function BrandingPreview() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <p className="text-center text-sm text-gray-500 mb-8 font-medium uppercase tracking-widest">Vista previa — Portal RH</p>

      <div className="flex gap-8 flex-wrap justify-center">

        {/* ── LOGIN PAGE ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-1">Página de Login</p>
          <div className="w-[380px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 px-8 pt-10 pb-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 30%, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
              {/* Logo mark */}
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-2 ring-white/30">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Portal RH</h1>
              <p className="text-blue-100 text-sm mt-1.5 leading-snug">Toda la gestión de tu gente<br/>en un solo lugar</p>
            </div>

            {/* Form area */}
            <div className="px-8 py-7 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Correo electrónico</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">admin@empresa.com</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Contraseña</label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">••••••••</div>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold shadow-sm mt-1">
                Ingresar
              </button>
              <p className="text-center text-xs text-gray-400 pt-1">Sistema Integral de Gestión de Recursos Humanos</p>
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-1">Sidebar Admin</p>
          <div className="w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Logo area */}
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 leading-tight">Portal RH</div>
                  <div className="text-[10px] text-gray-400 leading-snug mt-0.5">Sistema Integral de Gestión<br/>de Recursos Humanos</div>
                </div>
              </div>
            </div>
            {/* Nav items preview */}
            <div className="p-3 space-y-0.5">
              {[
                { label: "Inicio", active: false },
                { label: "Empleados", active: true },
                { label: "Organigrama", active: false },
                { label: "Nómina", active: false },
              ].map(item => (
                <div key={item.label} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${item.active ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.active ? "bg-blue-600" : "bg-gray-300"}`} />
                  {item.label}
                  {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </div>
              ))}
              <div className="text-xs text-gray-300 px-3 pt-1">...</div>
            </div>
          </div>
        </div>

        {/* ── PORTAL NAV ── */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-1">Portal Empleado</p>
          <div className="w-[240px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm leading-tight">Portal RH</div>
                  <div className="text-[10px] text-gray-400 leading-tight">Portal del Empleado</div>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-0.5">
              {["Mi Dashboard", "Mi Perfil", "Mis Entrenamientos", "Directorio"].map((label, i) => (
                <div key={label} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${i === 0 ? "bg-blue-50 text-blue-700" : "text-gray-500"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-blue-600" : "bg-gray-200"}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <p className="text-center text-xs text-gray-400 mt-8">¿Te gusta así? Dime y aplico los cambios en todo el sistema.</p>
    </div>
  );
}
