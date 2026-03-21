"use client";

import { useState, useEffect, useCallback } from "react";

interface Client {
  id: string;
  name: string;
  subdomain: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  brandName: string | null;
  createdAt: string;
  employeeCount: number;
  url: string | null;
}

interface NewClientForm {
  companyName: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

const EMPTY_FORM: NewClientForm = {
  companyName: "",
  subdomain: "",
  adminEmail: "",
  adminPassword: "",
  adminName: "",
};

export default function SuperAdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewClientForm>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");
  const [editLogoPreview, setEditLogoPreview] = useState("");
  const [editPrimaryColor, setEditPrimaryColor] = useState("#2563eb");
  const [editBrandName, setEditBrandName] = useState("");
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchClients = useCallback(async (pwd: string) => {
    setLoading(true);
    const res = await fetch("/api/superadmin/clients", {
      headers: { "x-superadmin-key": pwd },
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setClients(data.clients);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/superadmin/clients", {
      headers: { "x-superadmin-key": password },
    });
    if (res.ok) {
      setAuthed(true);
      const data = await res.json();
      setClients(data.clients ?? []);
    } else {
      setAuthError("Contraseña incorrecta");
    }
  }

  useEffect(() => {
    if (authed) fetchClients(password);
  }, [authed, fetchClients, password]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setFormLoading(true);

    const res = await fetch("/api/superadmin/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-superadmin-key": password,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setFormLoading(false);

    if (data.ok) {
      setFormSuccess(`✓ Cliente creado. URL: ${data.url}`);
      setForm(EMPTY_FORM);
      fetchClients(password);
    } else {
      setFormError(data.error ?? "Error desconocido");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editClient) return;

    const res = await fetch(`/api/superadmin/clients/${editClient.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-superadmin-key": password,
      },
      body: JSON.stringify({
        name: editName,
        logoUrl: editLogoUrl || null,
        primaryColor: editPrimaryColor,
        brandName: editBrandName || null,
      }),
    });

    if (res.ok) {
      setEditClient(null);
      fetchClients(password);
    }
  }

  // Auto-fill subdomain from company name
  function handleCompanyNameChange(val: string) {
    const sub = val
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9-]/g, "");
    setForm((f) => ({ ...f, companyName: val, subdomain: sub }));
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold text-white mb-1">Portal RH</div>
            <div className="text-gray-400 text-sm">Panel de Administración</div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contraseña maestra</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••••"
                required
                autoFocus
              />
            </div>
            {authError && <p className="text-red-400 text-sm">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Portal RH — Superadmin</h1>
          <p className="text-gray-400 text-sm">{clients.length} cliente{clients.length !== 1 ? "s" : ""} activos</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(""); setFormSuccess(""); }}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg transition flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Nuevo cliente
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Clients table */}
        {loading ? (
          <div className="text-center text-gray-500 py-20">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="text-center text-gray-500 py-20">No hay clientes aún.</div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="text-left px-6 py-3 font-medium">Empresa</th>
                  <th className="text-left px-6 py-3 font-medium">Subdominio</th>
                  <th className="text-left px-6 py-3 font-medium">Empleados</th>
                  <th className="text-left px-6 py-3 font-medium">Creado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition ${i % 2 === 0 ? "" : ""}`}
                  >
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4">
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          {c.subdomain}.portal-hr.com ↗
                        </a>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{c.employeeCount}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(c.createdAt).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditClient(c);
                          setEditName(c.name);
                          setEditLogoUrl(c.logoUrl ?? "");
                          setEditLogoPreview(c.logoUrl ?? "");
                          setEditPrimaryColor(c.primaryColor ?? "#2563eb");
                          setEditBrandName(c.brandName ?? "");
                        }}
                        className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded border border-gray-700 hover:border-gray-500 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeleteClient(c)}
                        className="text-red-500 hover:text-red-400 text-sm px-3 py-1 rounded border border-red-900 hover:border-red-700 transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* New Client Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Nuevo cliente</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de la empresa *</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => handleCompanyNameChange(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="KM Destinos"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subdominio *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => setForm((f) => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="kmdestinos"
                    required
                  />
                  <span className="text-gray-500 text-sm whitespace-nowrap">.portal-hr.com</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email admin *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@empresa.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Contraseña admin *</label>
                  <input
                    type="text"
                    value={form.adminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contraseña123"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del administrador</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan Pérez"
                />
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              {formSuccess && <p className="text-green-400 text-sm">{formSuccess}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError(""); setFormSuccess(""); setForm(EMPTY_FORM); }}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  {formLoading ? "Creando..." : "Crear cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Editar cliente</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de la empresa</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de marca (opcional)</label>
                <input
                  type="text"
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="KM Destinos"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Logo de la empresa</label>
                {/* Preview */}
                {editLogoPreview && (
                  <div className="mb-3 flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <img src={editLogoPreview} alt="Logo preview" className="h-12 max-w-[160px] object-contain rounded" />
                    <button
                      type="button"
                      onClick={() => { setEditLogoUrl(""); setEditLogoPreview(""); }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Quitar logo
                    </button>
                  </div>
                )}
                {/* File upload */}
                <label className="flex items-center gap-3 cursor-pointer w-full bg-gray-800 border border-gray-700 border-dashed rounded-lg px-4 py-3 hover:border-blue-500 transition">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span className="text-sm text-gray-400">
                    {editLogoPreview ? "Cambiar imagen" : "Subir logo"} — PNG, JPG, SVG (max 1MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 1024 * 1024) {
                        alert("La imagen no puede superar 1MB. Comprime el archivo e intenta de nuevo.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const result = ev.target?.result as string;
                        setEditLogoUrl(result);
                        setEditLogoPreview(result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Color principal de marca</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editPrimaryColor}
                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer bg-gray-800 border border-gray-700"
                  />
                  <input
                    type="text"
                    value={editPrimaryColor}
                    onChange={(e) => setEditPrimaryColor(e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">URL del sistema</label>
                <p className="text-blue-400 text-sm">{editClient.url ?? "—"}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Empleados activos</label>
                <p className="text-white">{editClient.employeeCount}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditClient(null)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">¿Eliminar cliente?</h2>
              <p className="text-gray-400 text-sm">
                Estás a punto de eliminar <span className="text-white font-semibold">{deleteClient.name}</span> y todos sus datos (empleados, usuarios, etc.). Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteClient(null)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  setDeleteLoading(true);
                  const res = await fetch(`/api/superadmin/clients/${deleteClient.id}`, {
                    method: "DELETE",
                    headers: { "x-superadmin-key": password },
                  });
                  setDeleteLoading(false);
                  if (res.ok) {
                    setDeleteClient(null);
                    fetchClients(password);
                  }
                }}
                disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {deleteLoading ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
