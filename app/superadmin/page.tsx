"use client";

import { useState, useEffect, useCallback } from "react";

interface Client {
  id: string;
  name: string;
  subdomain: string | null;
  logoUrl: string | null;
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
      body: JSON.stringify({ name: editName }),
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setEditClient(c); setEditName(c.name); }}
                        className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded border border-gray-700 hover:border-gray-500 transition"
                      >
                        Editar
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
    </div>
  );
}
