// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – resend is installed at build time
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "PortalRH <notificaciones@portal-hr.com>";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EmailResult {
  ok: boolean;
  error?: string;
}

// ─── Helper base ──────────────────────────────────────────────────────────────

async function send(opts: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<EmailResult> {
  try {
    const { error } = await resend.emails.send({
      from: opts.from ?? FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    console.error("[EMAIL]", msg);
    return { ok: false, error: msg };
  }
}

// ─── Plantilla base HTML ──────────────────────────────────────────────────────

function baseTemplate(opts: {
  brandName: string;
  primaryColor: string;
  title: string;
  body: string;
  footer?: string;
}) {
  const { brandName, primaryColor, title, body, footer } = opts;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:${primaryColor};padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-.3px;">${brandName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">${title}</h2>
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                ${footer ?? `© ${new Date().getFullYear()} ${brandName} · Este es un correo automático, no responder.`}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Obtener branding de una empresa ─────────────────────────────────────────

export interface BrandingInfo {
  brandName: string;
  primaryColor: string;
  adminEmail?: string;
}

// ─── 1. Bienvenida a nuevo empleado ──────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  employeeName: string;
  tempPassword: string;
  loginUrl: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, tempPassword, loginUrl, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Tu cuenta en <strong>${branding.brandName}</strong> ha sido creada. A continuación tus credenciales de acceso:
    </p>
    <table style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Correo</td><td style="color:#111827;font-size:14px;font-weight:600;">${to}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Contraseña temporal</td><td style="color:#111827;font-size:14px;font-weight:600;">${tempPassword}</td></tr>
    </table>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Por seguridad, te recomendamos cambiar tu contraseña al ingresar por primera vez.
    </p>
    <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Ingresar ahora
    </a>
  `;
  return send({
    to,
    subject: `Bienvenido a ${branding.brandName} — Tus credenciales de acceso`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: `Bienvenido a ${branding.brandName}`, body }),
  });
}

// ─── 2. Solicitud de vacaciones (al empleado) ─────────────────────────────────

export async function sendVacationRequestConfirmation(opts: {
  to: string;
  employeeName: string;
  tipo: string;
  startDate: string;
  endDate: string;
  days: number;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, tipo, startDate, endDate, days, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Tu solicitud de <strong>${tipo}</strong> ha sido recibida y está pendiente de aprobación.
    </p>
    <table style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Tipo</td><td style="color:#111827;font-size:14px;font-weight:600;">${tipo}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha inicio</td><td style="color:#111827;font-size:14px;font-weight:600;">${startDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha fin</td><td style="color:#111827;font-size:14px;font-weight:600;">${endDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Total días</td><td style="color:#111827;font-size:14px;font-weight:600;">${days} día${days !== 1 ? "s" : ""}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Estado</td><td style="color:#d97706;font-size:14px;font-weight:600;">⏳ Pendiente</td></tr>
    </table>
    <p style="color:#6b7280;font-size:13px;">Te notificaremos cuando tu solicitud sea revisada.</p>
  `;
  return send({
    to,
    subject: `Solicitud de ${tipo} recibida — ${startDate} al ${endDate}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: `Solicitud de ${tipo} recibida`, body }),
  });
}

// ─── 3. Notificación de vacaciones al manager / admin ─────────────────────────

export async function sendVacationRequestToAdmin(opts: {
  to: string;
  employeeName: string;
  employeeEmail: string;
  tipo: string;
  startDate: string;
  endDate: string;
  days: number;
  motivo?: string;
  portalUrl: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, employeeEmail, tipo, startDate, endDate, days, motivo, portalUrl, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      El empleado <strong>${employeeName}</strong> (${employeeEmail}) ha solicitado <strong>${tipo}</strong>.
    </p>
    <table style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Tipo</td><td style="color:#111827;font-size:14px;font-weight:600;">${tipo}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha inicio</td><td style="color:#111827;font-size:14px;font-weight:600;">${startDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha fin</td><td style="color:#111827;font-size:14px;font-weight:600;">${endDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Total días</td><td style="color:#111827;font-size:14px;font-weight:600;">${days} día${days !== 1 ? "s" : ""}</td></tr>
      ${motivo ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Motivo</td><td style="color:#374151;font-size:14px;">${motivo}</td></tr>` : ""}
    </table>
    <a href="${portalUrl}/vacaciones" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Revisar y aprobar
    </a>
  `;
  return send({
    to,
    subject: `Nueva solicitud de ${tipo} — ${employeeName}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: `Nueva solicitud de ${tipo}`, body }),
  });
}

// ─── 4. Respuesta a solicitud de vacaciones (aprobada / rechazada) ─────────────

export async function sendVacationDecision(opts: {
  to: string;
  employeeName: string;
  tipo?: string;
  startDate: string;
  endDate: string;
  days: number;
  approved: boolean;
  reason?: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, tipo, startDate, endDate, days, approved, reason, branding } = opts;
  const tipoLabel   = tipo ?? "Solicitud";
  const statusLabel = approved ? "✅ Aprobada" : "❌ Rechazada";
  const statusColor = approved ? "#16a34a" : "#dc2626";
  const bgColor     = approved ? "#f0fdf4" : "#fef2f2";
  const borderColor = approved ? "#bbf7d0" : "#fecaca";
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Tu solicitud de <strong>${tipoLabel}</strong> ha sido <strong style="color:${statusColor};">${approved ? "aprobada" : "rechazada"}</strong>.
    </p>
    <table style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Tipo</td><td style="color:#111827;font-size:14px;font-weight:600;">${tipoLabel}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha inicio</td><td style="color:#111827;font-size:14px;font-weight:600;">${startDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha fin</td><td style="color:#111827;font-size:14px;font-weight:600;">${endDate}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Total días</td><td style="color:#111827;font-size:14px;font-weight:600;">${days} día${days !== 1 ? "s" : ""}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Estado</td><td style="color:${statusColor};font-size:14px;font-weight:600;">${statusLabel}</td></tr>
      ${reason ? `<tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Comentario</td><td style="color:#374151;font-size:14px;">${reason}</td></tr>` : ""}
    </table>
  `;
  return send({
    to,
    subject: `${tipoLabel} ${approved ? "aprobada" : "rechazada"} — ${startDate} al ${endDate}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: `${tipoLabel} ${approved ? "aprobada" : "rechazada"}`, body }),
  });
}

// ─── 5. Nómina publicada ──────────────────────────────────────────────────────

export async function sendPayrollNotification(opts: {
  to: string;
  employeeName: string;
  period: string;
  netPay: string;
  portalUrl: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, period, netPay, portalUrl, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Tu recibo de nómina del período <strong>${period}</strong> ya está disponible.
    </p>
    <table style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Período</td><td style="color:#111827;font-size:14px;font-weight:600;">${period}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Pago neto</td><td style="color:#1d4ed8;font-size:18px;font-weight:700;">${netPay}</td></tr>
    </table>
    <a href="${portalUrl}/mi-portal" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Ver recibo completo
    </a>
  `;
  return send({
    to,
    subject: `Nómina disponible — ${period}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: "Tu nómina está lista", body }),
  });
}

// ─── 6. Recordatorio de entrenamiento ────────────────────────────────────────

export async function sendTrainingReminder(opts: {
  to: string;
  employeeName: string;
  trainingName: string;
  dueDate: string;
  portalUrl: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, trainingName, dueDate, portalUrl, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Tienes un entrenamiento pendiente que vence pronto.
    </p>
    <table style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;width:100%;margin:16px 0;">
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Entrenamiento</td><td style="color:#111827;font-size:14px;font-weight:600;">${trainingName}</td></tr>
      <tr><td style="color:#6b7280;font-size:13px;padding:4px 0;">Fecha límite</td><td style="color:#ea580c;font-size:14px;font-weight:600;">⚠️ ${dueDate}</td></tr>
    </table>
    <a href="${portalUrl}/mi-portal" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Completar entrenamiento
    </a>
  `;
  return send({
    to,
    subject: `Recordatorio: "${trainingName}" vence el ${dueDate}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: "Recordatorio de entrenamiento", body }),
  });
}

// ─── 7. Contraseña reseteada por admin ────────────────────────────────────────

export async function sendPasswordReset(opts: {
  to: string;
  employeeName: string;
  newPassword: string;
  loginUrl: string;
  branding: BrandingInfo;
}): Promise<EmailResult> {
  const { to, employeeName, newPassword, loginUrl, branding } = opts;
  const body = `
    <p style="color:#374151;font-size:15px;line-height:1.6;">Hola <strong>${employeeName}</strong>,</p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      Un administrador ha restablecido tu contraseña. Tu nueva contraseña temporal es:
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
      <code style="font-size:22px;font-weight:700;color:#111827;letter-spacing:2px;">${newPassword}</code>
    </div>
    <p style="color:#6b7280;font-size:13px;">Por seguridad, cámbiala al ingresar.</p>
    <a href="${loginUrl}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:${branding.primaryColor};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Ingresar ahora
    </a>
  `;
  return send({
    to,
    subject: `Tu contraseña ha sido restablecida — ${branding.brandName}`,
    html: baseTemplate({ brandName: branding.brandName, primaryColor: branding.primaryColor, title: "Contraseña restablecida", body }),
  });
}
