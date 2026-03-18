"use client";

import { useState, FormEvent } from "react";

interface Props {
  employeeId: string;
  employeeName: string;
  hasAccess: boolean;
  currentEmail?: string | null;
}

export default function AccesoEmpleadoBtn({ employeeId, employeeName, hasAccess, currentEmail }: Props) {
  const [open,    setOpen]    = useState(false);
  const [email,   setEmail]   = useState(currentEmail || "");
  const [pass,    setPass]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (pass !== confirm) { showToast("Las contraseñas no coinciden", false); return; }
    if (pass.length < 6)  { showToast("La contraseña debe tener al menos 6 caracteres", false); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/empleados-acceso", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ employeeId, email, password: pass }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.created ? "Acceso creado exitosamente" : "Credenciales actualizadas", true);
        setOpen(false); setPass(""); setConfirm("");
      } else {
        showToast(data.error || "Error al crear acceso", false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition ${
          hasAccess
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        }`}
        title={hasAccess ? "Actualizar acceso" : "Crear acceso al portal"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        {hasAccess ? "Acceso activo" : "Crear acceso"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {hasAccess ? "Actualizar acceso" : "Crear acceso al portal"}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{employeeName}</p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {!hasAccess && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                  El empleado podrá acceder al portal con estas credenciales para ver su perfil,
                  solicitar cambios y ver sus entrenamientos.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Correo electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="empleado@empresa.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {hasAccess ? "Nueva contraseña" : "Contraseña"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  required
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirmar contraseña <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repite la contraseña"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setPass(""); setConfirm(""); }}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : hasAccess ? "Actualizar" : "Crear acceso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
