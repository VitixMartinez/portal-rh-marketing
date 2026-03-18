"use client";

import { useRef, useState } from "react";

interface Props {
  employeeId:    string;
  initials:      string;
  bgColor:       string;
  photoUrl:      string | null;
  userRole:      string | null;
  isOwnProfile:  boolean;
}

export default function AvatarUpload({ employeeId, initials, bgColor, photoUrl, userRole, isOwnProfile }: Props) {
  const inputRef                      = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [loading,  setLoading]        = useState(false);
  const [toast,    setToast]          = useState<{ msg: string; ok: boolean } | null>(null);
  const [current,  setCurrent]        = useState<string | null>(photoUrl);

  // Admin can edit anyone; other roles only their own profile
  const isAdmin = userRole === "OWNER_ADMIN";
  const canEdit = isAdmin || isOwnProfile;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 7000);
  }

  // Step 1: user picks a file → show confirmation modal
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPendingPreview(ev.target?.result as string);
      setPendingFile(file);
    };
    reader.readAsDataURL(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Step 2: user confirms → upload
  async function confirmUpload() {
    if (!pendingFile) return;
    setLoading(true);
    setPendingPreview(null);
    setPendingFile(null);
    try {
      const fd = new FormData();
      fd.append("photo", pendingFile);
      const res  = await fetch(`/api/employees/${employeeId}/photo`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir");

      if (data.applied) {
        setCurrent(data.photoUrl.replace("/uploads/photos/", ""));
        showToast("✓ Foto actualizada correctamente", true);
      } else {
        showToast(data.message ?? "Solicitud enviada. Pendiente de aprobación.", true);
      }
    } catch (err: any) {
      showToast(err.message ?? "Error al subir la foto", false);
    } finally {
      setLoading(false);
    }
  }

  function cancelUpload() {
    setPendingFile(null);
    setPendingPreview(null);
  }

  const displayPhoto = current ? `/uploads/photos/${current}` : null;

  return (
    <>
      {/* ── Confirmation modal ── */}
      {pendingPreview && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px",
        }}>
          <div style={{
            background: "white", borderRadius: "20px",
            padding: "28px", maxWidth: "340px", width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            textAlign: "center",
          }}>
            <p style={{ fontWeight: 700, fontSize: "16px", color: "#111827", marginBottom: "6px" }}>
              Cambiar foto de perfil
            </p>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
              {isAdmin
                ? "La foto se aplicará de inmediato."
                : "Se enviará al administrador para aprobación."}
            </p>

            {/* Preview comparison */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "24px" }}>
              {/* Current */}
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "6px" }}>Actual</p>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "12px",
                  overflow: "hidden", border: "2px solid #e5e7eb",
                  backgroundColor: bgColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontWeight: 700, fontSize: "18px",
                }}>
                  {displayPhoto
                    ? <img src={displayPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials}
                </div>
              </div>

              {/* Arrow */}
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>

              {/* New */}
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "#3b82f6", marginBottom: "6px" }}>Nueva</p>
                <img src={pendingPreview} style={{
                  width: "64px", height: "64px", borderRadius: "12px",
                  objectFit: "cover", border: "2px solid #3b82f6",
                }} />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={cancelUpload}
                style={{
                  flex: 1, padding: "10px", borderRadius: "12px",
                  border: "1.5px solid #e5e7eb", background: "white",
                  color: "#374151", fontWeight: 600, fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                style={{
                  flex: 1, padding: "10px", borderRadius: "12px",
                  border: "none", background: "#2563eb",
                  color: "white", fontWeight: 600, fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {isAdmin ? "Aplicar" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", zIndex: 9998,
          padding: "14px 18px", borderRadius: "14px",
          background: toast.ok ? "#16a34a" : "#dc2626",
          color: "white", fontWeight: 500, fontSize: "14px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          maxWidth: "380px", lineHeight: "1.4",
          display: "flex", alignItems: "flex-start", gap: "10px",
        }}>
          <span style={{ fontSize: "16px", marginTop: "1px" }}>{toast.ok ? "✓" : "✗"}</span>
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "16px", marginLeft: "auto", padding: "0 0 0 8px" }}
          >×</button>
        </div>
      )}

      {/* ── Avatar ── */}
      <div className="w-20 h-20 flex-shrink-0" style={{ position: "relative", zIndex: 10 }}>
        <div style={{
          position: "relative", width: "80px", height: "80px",
          borderRadius: "16px", border: "4px solid white",
          boxShadow: "0 20px 25px -5px rgb(0 0 0/.1),0 8px 10px -6px rgb(0 0 0/.1)",
          overflow: "hidden",
          backgroundColor: displayPhoto ? undefined : bgColor,
        }}>
          {displayPhoto ? (
            <img src={displayPhoto} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "1.5rem", fontWeight: 700 }}>
              {loading ? (
                <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.3 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                  <path fill="white" style={{ opacity: 0.8 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : initials}
            </div>
          )}

          {loading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.3 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="3" />
                <path fill="white" style={{ opacity: 0.8 }} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {canEdit && !loading && (
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                position: "absolute", right: "6px", bottom: "6px",
                width: "22px", height: "22px", borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", border: "none", padding: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "white")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.92)")}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }} onChange={handleFileChange} />
      </div>
    </>
  );
}
