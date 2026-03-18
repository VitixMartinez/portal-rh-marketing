"use client";

import { useState } from "react";

interface Props {
  userId:      string;
  currentRole: string;
  employeeName: string;
}

const ROLES = [
  { value: "EMPLOYEE",    label: "Empleado",       desc: "Solo puede ver su propio perfil en el portal",            color: "text-gray-600" },
  { value: "MANAGER",     label: "Gerente / Jefe", desc: "Ve y aprueba solicitudes de su equipo directo",           color: "text-blue-600" },
  { value: "OWNER_ADMIN", label: "Administrador",  desc: "Acceso completo a todo el sistema",                       color: "text-violet-600" },
];

export default function CambiarRolBtn({ userId, currentRole, employeeName }: Props) {
  const [open,   setOpen]   = useState(false);
  const [role,   setRole]   = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState<{ msg: string; ok: boolean } | null>(null);

  const currentLabel = ROLES.find(r => r.value === currentRole)?.label || currentRole;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    if (role === currentRole) { setOpen(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Rol actualizado correctamente", true);
        setOpen(false);
        // Refresh page so the new role is reflected
        setTimeout(() => window.location.reload(), 800);
      } else {
        showToast(data.error || "Error al cambiar rol", false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
        title="Cambiar rol del usuario"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        {currentLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Cambiar rol</h3>
              <p className="text-xs text-gray-500 mt-0.5">{employeeName}</p>
            </div>
            <div className="px-6 py-5 space-y-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    role === r.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    role === r.value ? "border-blue-500 bg-blue-500" : "border-gray-300"
                  }`}>
                    {role === r.value && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${role === r.value ? "text-blue-700" : "text-gray-800"}`}>{r.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={() => { setOpen(false); setRole(currentRole); }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || role === currentRole}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
