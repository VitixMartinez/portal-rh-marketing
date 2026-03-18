"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
type Categoria = "SEGURIDAD_INFO" | "SEGURIDAD_OCUP" | "POLITICAS" | "LIDERAZGO"
               | "TECNICO" | "COMPLIANCE" | "SOFT_SKILLS" | "INDUCCION" | "OTRO";
type Recurrencia = "UNA_VEZ" | "ANUAL" | "SEMESTRAL" | "TRIMESTRAL";
type AsignacionEstado = "PENDIENTE" | "EN_PROGRESO" | "COMPLETADO" | "VENCIDO" | "EXCUSADO";

type TipoPregunta = "seleccion" | "poll" | "abierta" | "escala";
type Opcion   = { id: string; texto: string; correcta: boolean };
type Pregunta = { id: string; tipo: TipoPregunta; pregunta: string; opciones: Opcion[] };
type Material = { tipo: "pdf" | "pptx" | "video" | "enlace"; nombre: string; url: string };

type Curso = {
  id:              string;
  titulo:          string;
  descripcion:     string | null;
  categoria:       Categoria;
  modalidad:       string | null;
  duracionHrs:     number | null;
  recurrencia:     Recurrencia;
  obligatorio:     boolean;
  activo:          boolean;
  materiales:      Material[];
  preguntas:       Pregunta[];
  tieneEvaluacion: boolean;
  notaAprobatoria: number;
  asignaciones:    { estado: AsignacionEstado }[];
  _count:          { asignaciones: number };
};

type Asignacion = {
  id:              string;
  cursoId:         string;
  employeeId:      string;
  estado:          AsignacionEstado;
  fechaLimite:     string | null;
  fechaCompletado: string | null;
  notas:           string | null;
  curso:    { id: string; titulo: string; categoria: Categoria; obligatorio: boolean; recurrencia: Recurrencia };
  employee: { id: string; firstName: string; lastName: string; jobTitle: string | null; department: { name: string } | null };
};

type Employee = { id: string; firstName: string; lastName: string; jobTitle: string | null; department: { name: string } | null };

type Resultado = {
  id: string; cursoId: string; employeeId: string;
  puntaje: number; aprobado: boolean; intento: number; createdAt: string;
  employee: { firstName: string; lastName: string; jobTitle: string | null };
};

type CertData = {
  employeeName: string;
  jobTitle: string | null;
  courseName: string;
  categoria: Categoria;
  duracionHrs: number | null;
  modalidad: string | null;
  fechaCompletado: string;
};

/* ── Constants ─────────────────────────────────────────────────────────── */
const CAT_LABEL: Record<Categoria, string> = {
  SEGURIDAD_INFO: "Seguridad de la Información", SEGURIDAD_OCUP: "Seguridad Ocupacional",
  POLITICAS: "Políticas de Empresa", LIDERAZGO: "Liderazgo", TECNICO: "Técnico / Puesto",
  COMPLIANCE: "Compliance / Legal", SOFT_SKILLS: "Habilidades Blandas", INDUCCION: "Inducción", OTRO: "Otro",
};
const CAT_COLOR: Record<Categoria, string> = {
  SEGURIDAD_INFO: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  SEGURIDAD_OCUP: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  POLITICAS:      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  LIDERAZGO:      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  TECNICO:        "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  COMPLIANCE:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  SOFT_SKILLS:    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  INDUCCION:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  OTRO:           "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400",
};
const REC_LABEL: Record<Recurrencia, string> = { UNA_VEZ: "Una vez", ANUAL: "Anual", SEMESTRAL: "Semestral", TRIMESTRAL: "Trimestral" };
const ESTADO_CFG: Record<AsignacionEstado, { label: string; cls: string; dot: string }> = {
  PENDIENTE:   { label: "Pendiente",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",       dot: "bg-amber-500" },
  EN_PROGRESO: { label: "En progreso", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",           dot: "bg-blue-500" },
  COMPLETADO:  { label: "Completado",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", dot: "bg-emerald-500" },
  VENCIDO:     { label: "Vencido",     cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",               dot: "bg-red-500" },
  EXCUSADO:    { label: "Excusado",    cls: "bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400",              dot: "bg-gray-400" },
};
const AVATAR_COLORS = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-sky-500","bg-indigo-500","bg-teal-500"];
function avatarColor(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }

const EMPTY_CURSO = {
  titulo: "", descripcion: "", categoria: "OTRO" as Categoria,
  modalidad: "Virtual", duracionHrs: "", recurrencia: "UNA_VEZ" as Recurrencia,
  obligatorio: true, tieneEvaluacion: false, notaAprobatoria: 70,
  materiales: [] as Material[], preguntas: [] as Pregunta[],
};

const TIPO_PREGUNTA_LABEL: Record<TipoPregunta, string> = {
  seleccion: "✅ Selección múltiple",
  poll:      "📊 Encuesta (Poll)",
  abierta:   "✏️ Respuesta abierta",
  escala:    "🔢 Escala 0–10 (NPS)",
};

function newPregunta(tipo: TipoPregunta = "seleccion"): Pregunta {
  return {
    id: Math.random().toString(36).slice(2),
    tipo,
    pregunta: "",
    opciones: [
      { id: "a", texto: "", correcta: false },
      { id: "b", texto: "", correcta: false },
      { id: "c", texto: "", correcta: false },
      { id: "d", texto: "", correcta: false },
    ],
  };
}

type Tab = "catalogo" | "asignaciones" | "compliance";
type FormTab = "info" | "materiales" | "evaluacion";

const ic = (name: string) => `w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-zinc-100`;
const lc = `text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1 block`;

export default function EntrenamientoPage() {
  const [tab, setTab]                       = useState<Tab>("catalogo");
  const [cursos, setCursos]                 = useState<Curso[]>([]);
  const [asignaciones, setAsignaciones]     = useState<Asignacion[]>([]);
  const [employees, setEmployees]           = useState<Employee[]>([]);
  const [loading, setLoading]               = useState(true);

  // Form
  const [showForm, setShowForm]             = useState(false);
  const [editCurso, setEditCurso]           = useState<Curso | null>(null);
  const [form, setForm]                     = useState(EMPTY_CURSO);
  const [formTab, setFormTab]               = useState<FormTab>("info");
  const [saving, setSaving]                 = useState(false);
  const [uploading, setUploading]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Video / link quick-add
  const [videoUrl, setVideoUrl]             = useState("");
  const [videoNombre, setVideoNombre]       = useState("");
  const [enlaceUrl, setEnlaceUrl]           = useState("");
  const [enlaceNombre, setEnlaceNombre]     = useState("");

  // Assign
  const [showAsignar, setShowAsignar]       = useState(false);
  const [asignarCursoId, setAsignarCursoId] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [fechaLimite, setFechaLimite]       = useState("");
  const [assigning, setAssigning]           = useState(false);
  const [asignarMode, setAsignarMode]       = useState<"individual" | "departamento">("individual");

  // Quiz results viewer
  const [resultadosCursoId, setResultadosCursoId] = useState<string | null>(null);
  const [resultados, setResultados]          = useState<Resultado[]>([]);
  const [loadingRes, setLoadingRes]          = useState(false);

  // Certificate
  const [certData, setCertData] = useState<CertData | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, e] = await Promise.all([
        fetch("/api/cursos").then(r => r.json()),
        fetch("/api/asignaciones").then(r => r.json()),
        fetch("/api/employees?status=ACTIVO").then(r => r.json()),
      ]);
      setCursos(Array.isArray(c) ? c : []);
      setAsignaciones(Array.isArray(a) ? a : []);
      setEmployees(Array.isArray(e) ? e : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  async function loadResultados(cursoId: string) {
    setResultadosCursoId(cursoId);
    setLoadingRes(true);
    try {
      const res = await fetch(`/api/cursos/${cursoId}/examen`);
      setResultados(res.ok ? await res.json() : []);
    } finally { setLoadingRes(false); }
  }

  /* ── Certificate ─────────────────────────────────────────────────── */
  function viewCertificate(a: Asignacion, overrideFecha?: string) {
    const curso = cursos.find(c => c.id === a.cursoId);
    setCertData({
      employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
      jobTitle: a.employee.jobTitle,
      courseName: a.curso.titulo,
      categoria: a.curso.categoria,
      duracionHrs: curso?.duracionHrs ?? null,
      modalidad: curso?.modalidad ?? null,
      fechaCompletado: overrideFecha ?? a.fechaCompletado ?? new Date().toISOString(),
    });
  }

  function printCertificate() {
    if (!certData) return;
    const dateStr = new Date(certData.fechaCompletado).toLocaleDateString("es-DO", {
      day: "numeric", month: "long", year: "numeric",
    });
    const catLabel = CAT_LABEL[certData.categoria] ?? certData.categoria;
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado – ${certData.employeeName}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 297mm; height: 210mm;
    display: flex; align-items: center; justify-content: center;
    background: #fff; font-family: Georgia, 'Times New Roman', serif;
  }
  .cert {
    width: 270mm; height: 190mm;
    border: 4px double #1e3a8a;
    position: relative;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 14mm 22mm;
    text-align: center;
    background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 60%, #f0f7ff 100%);
  }
  .cert::before {
    content: ''; position: absolute; inset: 8px;
    border: 1px solid #93c5fd; pointer-events: none;
  }
  .corner { position: absolute; width: 28px; height: 28px; border-color: #1e3a8a; border-style: solid; }
  .tl { top: 14px; left: 14px; border-width: 3px 0 0 3px; }
  .tr { top: 14px; right: 14px; border-width: 3px 3px 0 0; }
  .bl { bottom: 14px; left: 14px; border-width: 0 0 3px 3px; }
  .br { bottom: 14px; right: 14px; border-width: 0 3px 3px 0; }
  .org { font-size: 9pt; color: #6b7280; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px; font-family: Arial, sans-serif; }
  .divider { width: 80px; height: 2px; background: #1e3a8a; margin: 0 auto 10px; }
  .cert-title { font-size: 24pt; color: #1e3a8a; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; }
  .intro { font-size: 10pt; color: #4b5563; margin-bottom: 10px; font-family: Arial, sans-serif; }
  .emp-name { font-size: 26pt; color: #111827; font-weight: bold; border-bottom: 2px solid #1e3a8a; padding-bottom: 5px; margin-bottom: 4px; display: inline-block; min-width: 280px; }
  .emp-title { font-size: 9pt; color: #6b7280; margin-bottom: 12px; font-family: Arial, sans-serif; font-style: italic; }
  .course-label { font-size: 10pt; color: #4b5563; margin-bottom: 5px; font-family: Arial, sans-serif; }
  .course-name { font-size: 17pt; color: #1e3a8a; font-weight: bold; margin-bottom: 14px; }
  .details { display: flex; gap: 28px; justify-content: center; margin-bottom: 16px; }
  .detail { font-family: Arial, sans-serif; }
  .detail-val { font-size: 10pt; color: #111827; font-weight: bold; }
  .detail-lbl { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
  .sig-area { margin-top: 4px; }
  .sig-line { width: 160px; border-top: 1px solid #374151; margin: 0 auto 4px; }
  .sig-lbl { font-size: 8pt; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, sans-serif; }
  .seal { position: absolute; bottom: 20mm; right: 22mm; width: 48px; height: 48px; border-radius: 50%; border: 2px solid #1e3a8a; display: flex; align-items: center; justify-content: center; font-size: 22px; color: #1e3a8a; opacity: 0.7; }
  .cert-id { position: absolute; bottom: 14mm; left: 22mm; font-size: 7pt; color: #9ca3af; font-family: Arial, sans-serif; letter-spacing: 1px; }
</style>
</head>
<body>
<div class="cert">
  <div class="corner tl"></div><div class="corner tr"></div>
  <div class="corner bl"></div><div class="corner br"></div>

  <div class="org">Sistema de Recursos Humanos</div>
  <div class="divider"></div>
  <div class="cert-title">Certificado de Completación</div>
  <div class="intro">Por medio del presente se certifica que</div>
  <div class="emp-name">${certData.employeeName}</div>
  ${certData.jobTitle ? `<div class="emp-title">${certData.jobTitle}</div>` : "<div style='margin-bottom:12px'></div>"}
  <div class="course-label">ha completado satisfactoriamente el curso:</div>
  <div class="course-name">${certData.courseName}</div>
  <div class="details">
    <div class="detail"><div class="detail-val">${catLabel}</div><div class="detail-lbl">Categoría</div></div>
    ${certData.duracionHrs ? `<div class="detail"><div class="detail-val">${certData.duracionHrs} horas</div><div class="detail-lbl">Duración</div></div>` : ""}
    ${certData.modalidad ? `<div class="detail"><div class="detail-val">${certData.modalidad}</div><div class="detail-lbl">Modalidad</div></div>` : ""}
    <div class="detail"><div class="detail-val">${dateStr}</div><div class="detail-lbl">Fecha de completación</div></div>
  </div>
  <div class="sig-area">
    <div class="sig-line"></div>
    <div class="sig-lbl">Recursos Humanos</div>
  </div>
  <div class="seal"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
  <div class="cert-id">Emitido: ${new Date().toLocaleDateString("es-DO")} · ${certData.courseName.slice(0, 30)}</div>
</div>
</body></html>`;
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) { alert("Activa las ventanas emergentes para imprimir el certificado."); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  }

  /* ── Curso form ─────────────────────────────────────────────────────── */
  function openCreate() {
    setEditCurso(null);
    setForm(EMPTY_CURSO);
    setFormTab("info");
    setVideoUrl(""); setVideoNombre(""); setEnlaceUrl(""); setEnlaceNombre("");
    setShowForm(true);
  }

  function openEdit(c: Curso) {
    setEditCurso(c);
    setForm({
      titulo: c.titulo, descripcion: c.descripcion ?? "", categoria: c.categoria,
      modalidad: c.modalidad ?? "Virtual", duracionHrs: c.duracionHrs ? String(c.duracionHrs) : "",
      recurrencia: c.recurrencia, obligatorio: c.obligatorio,
      tieneEvaluacion: c.tieneEvaluacion, notaAprobatoria: c.notaAprobatoria,
      materiales: c.materiales ?? [], preguntas: c.preguntas ?? [],
    });
    setFormTab("info");
    setShowForm(true);
  }

  async function saveCurso(e: React.FormEvent) {
    e.preventDefault();
    if (form.tieneEvaluacion && form.preguntas.length === 0) {
      alert("Debes agregar al menos una pregunta para la evaluación.");
      setFormTab("evaluacion"); return;
    }
    setSaving(true);
    try {
      const url    = editCurso ? `/api/cursos/${editCurso.id}` : "/api/cursos";
      const method = editCurso ? "PATCH" : "POST";
      const res    = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await reload();
      setShowForm(false);
    } catch (err: any) { alert("Error al guardar: " + err.message); }
    finally { setSaving(false); }
  }

  async function toggleActivo(c: Curso) {
    await fetch(`/api/cursos/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo: !c.activo }) });
    await reload();
  }

  /* ── Materials ──────────────────────────────────────────────────────── */
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
          const tipo: Material["tipo"] = ext === "pdf" ? "pdf" : (ext === "pptx" || ext === "ppt") ? "pptx" : "enlace";
          setForm(p => ({ ...p, materiales: [...p.materiales, { tipo, nombre: file.name, url: data.url }] }));
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addVideo() {
    if (!videoUrl.trim()) return;
    setForm(p => ({ ...p, materiales: [...p.materiales, { tipo: "video", nombre: videoNombre || videoUrl, url: videoUrl }] }));
    setVideoUrl(""); setVideoNombre("");
  }

  function addEnlace() {
    if (!enlaceUrl.trim()) return;
    setForm(p => ({ ...p, materiales: [...p.materiales, { tipo: "enlace", nombre: enlaceNombre || enlaceUrl, url: enlaceUrl }] }));
    setEnlaceUrl(""); setEnlaceNombre("");
  }

  function removeMaterial(idx: number) {
    setForm(p => ({ ...p, materiales: p.materiales.filter((_, i) => i !== idx) }));
  }

  /* ── Quiz builder ───────────────────────────────────────────────────── */
  function addPregunta() {
    setForm(p => ({ ...p, preguntas: [...p.preguntas, newPregunta()] }));
  }

  function removePregunta(idx: number) {
    setForm(p => ({ ...p, preguntas: p.preguntas.filter((_, i) => i !== idx) }));
  }

  function updatePregunta(idx: number, field: "pregunta" | "tipo", value: string) {
    setForm(p => {
      const ps = [...p.preguntas];
      ps[idx] = { ...ps[idx], [field]: value };
      // If switching to abierta/escala, clear all correcta flags
      if (field === "tipo" && (value === "abierta" || value === "escala")) {
        ps[idx].opciones = ps[idx].opciones.map(o => ({ ...o, correcta: false }));
      }
      return { ...p, preguntas: ps };
    });
  }

  function updateOpcion(pidx: number, oidx: number, field: "texto" | "correcta", value: any) {
    setForm(p => {
      const ps = [...p.preguntas];
      const opts = [...ps[pidx].opciones];
      if (field === "correcta") {
        // Only one correct answer per question
        opts.forEach((o, i) => { opts[i] = { ...o, correcta: i === oidx }; });
      } else {
        opts[oidx] = { ...opts[oidx], [field]: value };
      }
      ps[pidx] = { ...ps[pidx], opciones: opts };
      return { ...p, preguntas: ps };
    });
  }

  /* ── Assignments ────────────────────────────────────────────────────── */
  function openAsignar(cursoId: string) { setAsignarCursoId(cursoId); setSelectedEmployees([]); setFechaLimite(""); setAsignarMode("individual"); setShowAsignar(true); }
  function toggleEmp(id: string) { setSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function toggleDept(empIds: string[]) {
    const allSel = empIds.every(id => selectedEmployees.includes(id));
    setSelectedEmployees(prev => allSel ? prev.filter(id => !empIds.includes(id)) : [...new Set([...prev, ...empIds])]);
  }

  async function doAsignar() {
    if (!selectedEmployees.length) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/asignaciones", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cursoId: asignarCursoId, employeeIds: selectedEmployees, fechaLimite: fechaLimite || null }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await reload(); setShowAsignar(false);
    } catch (err: any) { alert("Error: " + err.message); }
    finally { setAssigning(false); }
  }

  async function updateEstado(asId: string, estado: AsignacionEstado, a?: Asignacion) {
    const fechaCompletado = estado === "COMPLETADO" ? new Date().toISOString() : undefined;
    await fetch(`/api/asignaciones/${asId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado, fechaCompletado }) });
    await reload();
    if (estado === "COMPLETADO" && a) viewCertificate(a, fechaCompletado);
  }

  /* ── Compliance stats ───────────────────────────────────────────────── */
  const totalAs    = asignaciones.length;
  const completadas = asignaciones.filter(a => a.estado === "COMPLETADO").length;
  const vencidas    = asignaciones.filter(a => a.estado === "VENCIDO").length;
  const pendientes  = asignaciones.filter(a => a.estado === "PENDIENTE" || a.estado === "EN_PROGRESO").length;
  const compliance  = totalAs > 0 ? Math.round((completadas / totalAs) * 100) : 0;

  const deptMap = new Map<string, { total: number; completadas: number }>();
  asignaciones.forEach(a => {
    const dept = a.employee.department?.name ?? "Sin depto.";
    const cur  = deptMap.get(dept) ?? { total: 0, completadas: 0 };
    cur.total++; if (a.estado === "COMPLETADO") cur.completadas++;
    deptMap.set(dept, cur);
  });

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "catalogo",     label: "Catálogo de Cursos", count: cursos.length },
    { id: "asignaciones", label: "Asignaciones",       count: asignaciones.length },
    { id: "compliance",   label: "Compliance Dashboard" },
  ];

  // Group employees by department for the assignment modal
  const deptGroups: [string, Employee[]][] = (() => {
    const map = new Map<string, Employee[]>();
    employees.forEach(emp => {
      const dept = emp.department?.name ?? "Sin departamento";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  const TIPO_ICON: Record<Material["tipo"], string> = { pdf: "📄", pptx: "📊", video: "🎬", enlace: "🔗" };
  const TIPO_COLOR: Record<Material["tipo"], string> = {
    pdf:    "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
    pptx:   "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
    video:  "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    enlace: "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
  };

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Entrenamiento</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">Gestiona cursos, materiales, evaluaciones y el cumplimiento del equipo.</p>
        </div>
        {tab === "catalogo" && (
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nuevo curso
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Compliance global", value: `${compliance}%`, sub: "cursos completados", color: compliance >= 80 ? "text-emerald-600 dark:text-emerald-400" : compliance >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400" },
          { label: "Completados",       value: String(completadas), sub: "asignaciones",  color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pendientes",        value: String(pendientes),  sub: "asignaciones",  color: "text-amber-600 dark:text-amber-400" },
          { label: "Vencidos",          value: String(vencidas),    sub: "críticos",      color: "text-red-600 dark:text-red-400" },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-4">
            <div className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{k.label}</div>
            <div className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
            <div className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="border-b border-gray-100 dark:border-zinc-800 px-4 flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={["px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2",
                tab === t.id ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"].join(" ")}>
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold ${tab === t.id ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div> : (
            <>
              {/* ── Catálogo ── */}
              {tab === "catalogo" && (
                <div>
                  {cursos.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-5xl mb-4">📚</div>
                      <h3 className="text-base font-semibold text-gray-700 dark:text-zinc-300 mb-2">Sin cursos todavía</h3>
                      <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition">+ Crear primer curso</button>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {cursos.map(c => {
                        const total = c.asignaciones.length;
                        const done  = c.asignaciones.filter(a => a.estado === "COMPLETADO").length;
                        const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
                        return (
                          <div key={c.id} className={`rounded-2xl border ${c.activo ? "border-gray-200 dark:border-zinc-700" : "border-dashed border-gray-200 dark:border-zinc-800 opacity-60"} bg-white dark:bg-zinc-800/40 p-4 flex flex-col gap-3`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${CAT_COLOR[c.categoria]}`}>{CAT_LABEL[c.categoria]}</span>
                                  {c.obligatorio && <span className="text-xs text-red-500 font-semibold">Obligatorio</span>}
                                  {c.tieneEvaluacion && (
                                    <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full px-2 py-0.5 font-medium">
                                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
                                      Evaluación {c.notaAprobatoria}%
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{c.titulo}</h3>
                                {c.descripcion && <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1 line-clamp-2">{c.descripcion}</p>}
                              </div>
                              <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 transition flex-shrink-0">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                            </div>

                            {/* Materials badges */}
                            {(c.materiales ?? []).length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {c.materiales.map((m, i) => (
                                  <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border transition hover:opacity-80 ${TIPO_COLOR[m.tipo]}`}>
                                    {TIPO_ICON[m.tipo]} {m.tipo.toUpperCase()}
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
                              {c.duracionHrs && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  {c.duracionHrs}h
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                                {REC_LABEL[c.recurrencia]}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                {c.modalidad}
                              </span>
                            </div>

                            {total > 0 && (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-400 dark:text-zinc-500">{done}/{total} completados</span>
                                  <span className={pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}>{pct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-zinc-700 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-1 flex-wrap">
                              <button onClick={() => openAsignar(c.id)}
                                className="flex-1 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold py-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                                Asignar empleados
                              </button>
                              {c.tieneEvaluacion && (
                                <button onClick={() => loadResultados(c.id)}
                                  className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 hover:bg-indigo-100 transition">
                                  Ver resultados
                                </button>
                              )}
                              <button onClick={() => toggleActivo(c)}
                                className={`rounded-xl border text-xs font-medium px-3 py-1.5 transition ${c.activo ? "border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                                {c.activo ? "Archivar" : "Activar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Asignaciones ── */}
              {tab === "asignaciones" && (
                <div>
                  {asignaciones.length === 0 ? (
                    <div className="text-center py-16"><div className="text-5xl mb-4">📋</div><p className="text-sm text-gray-400">Sin asignaciones. Asigna cursos desde el Catálogo.</p></div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-zinc-800">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-zinc-800 border-b border-gray-100 dark:border-zinc-800">
                          <tr>
                            {["Colaborador","Curso","Fecha límite","Estado","Acción"].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                          {asignaciones.map(a => {
                            const sc = ESTADO_CFG[a.estado];
                            const initials = `${a.employee.firstName[0]}${a.employee.lastName[0]}`.toUpperCase();
                            const bc = avatarColor(a.employee.firstName + a.employee.lastName);
                            const overdue = a.estado === "PENDIENTE" && a.fechaLimite && new Date(a.fechaLimite) < new Date();
                            return (
                              <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg ${bc} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{initials}</div>
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-zinc-100">{a.employee.firstName} {a.employee.lastName}</div>
                                      <div className="text-xs text-gray-400 dark:text-zinc-500">{a.employee.department?.name ?? "Sin depto."}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-800 dark:text-zinc-200 text-sm">{a.curso.titulo}</div>
                                  <div className={`mt-0.5 text-xs inline-flex rounded-full px-2 py-0.5 font-medium ${CAT_COLOR[a.curso.categoria]}`}>{CAT_LABEL[a.curso.categoria]}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 dark:text-zinc-400">
                                  {a.fechaLimite ? <span className={overdue ? "text-red-500 font-medium" : ""}>{new Date(a.fechaLimite).toLocaleDateString("es-DO")}{overdue && " ⚠️"}</span> : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${sc.cls}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <select value={a.estado} onChange={e => updateEstado(a.id, e.target.value as AsignacionEstado, a)}
                                      className="text-xs rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-gray-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                      <option value="PENDIENTE">Pendiente</option>
                                      <option value="EN_PROGRESO">En progreso</option>
                                      <option value="COMPLETADO">Completado</option>
                                      <option value="VENCIDO">Vencido</option>
                                      <option value="EXCUSADO">Excusado</option>
                                    </select>
                                    {a.estado === "COMPLETADO" && (
                                      <button onClick={() => viewCertificate(a)} title="Ver certificado"
                                        className="p-1 rounded hover:bg-emerald-50 text-emerald-600 transition shrink-0" aria-label="Ver certificado">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Compliance ── */}
              {tab === "compliance" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium opacity-80">Compliance Global</div>
                        <div className="text-4xl font-bold mt-1">{compliance}%</div>
                      </div>
                      <svg className="w-14 h-14 opacity-30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div className="h-3 rounded-full bg-white transition-all" style={{ width: `${compliance}%` }} />
                    </div>
                    <div className="flex justify-between text-xs opacity-70 mt-2"><span>{completadas} completados</span><span>{totalAs} total</span></div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-3">Por departamento</h3>
                    <div className="space-y-3">
                      {Array.from(deptMap.entries()).map(([dept, stats]) => {
                        const pct = Math.round((stats.completadas / stats.total) * 100);
                        return (
                          <div key={dept} className="bg-gray-50 dark:bg-zinc-800/40 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">{dept}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{stats.completadas}/{stats.total}</span>
                                <span className={`text-sm font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}`}>{pct}%</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {deptMap.size === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay asignaciones aún.</p>}
                    </div>
                  </div>
                  {vencidas > 0 && (
                    <div>
                      <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3">⚠️ Vencidos ({vencidas})</h3>
                      <div className="space-y-2">
                        {asignaciones.filter(a => a.estado === "VENCIDO").map(a => (
                          <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20">
                            <span className="text-red-500 text-lg">⚠️</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{a.curso.titulo}</div>
                              <div className="text-xs text-gray-500 dark:text-zinc-400">{a.employee.firstName} {a.employee.lastName}</div>
                            </div>
                            {a.fechaLimite && <div className="text-xs text-red-500 flex-shrink-0">Venció: {new Date(a.fechaLimite).toLocaleDateString("es-DO")}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          Modal: Crear / Editar Curso (wide panel with 3 sub-tabs)
      ══════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-700 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editCurso ? "Editar curso" : "Nuevo curso"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="border-b border-gray-100 dark:border-zinc-800 px-6 flex gap-0 shrink-0">
              {(["info","materiales","evaluacion"] as FormTab[]).map(ft => (
                <button key={ft} onClick={() => setFormTab(ft)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${formTab === ft ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"}`}>
                  {ft === "info" ? "Información" : ft === "materiales" ? "Materiales" : "Evaluación"}
                  {ft === "materiales" && form.materiales.length > 0 && (
                    <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-1.5 py-0.5">{form.materiales.length}</span>
                  )}
                  {ft === "evaluacion" && form.preguntas.length > 0 && (
                    <span className="ml-1.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full px-1.5 py-0.5">{form.preguntas.length}</span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={saveCurso} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5">

                {/* ── Info Tab ── */}
                {formTab === "info" && (
                  <div className="space-y-4">
                    <div>
                      <label className={lc}>Título del curso *</label>
                      <input required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                        placeholder="Ej: Seguridad de la Información 2026" className={ic("")} />
                    </div>
                    <div>
                      <label className={lc}>Descripción</label>
                      <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                        rows={3} className={ic("") + " resize-none"} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lc}>Categoría</label>
                        <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value as Categoria }))} className={ic("")}>
                          {Object.entries(CAT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={lc}>Recurrencia</label>
                        <select value={form.recurrencia} onChange={e => setForm(p => ({ ...p, recurrencia: e.target.value as Recurrencia }))} className={ic("")}>
                          {Object.entries(REC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lc}>Modalidad</label>
                        <select value={form.modalidad} onChange={e => setForm(p => ({ ...p, modalidad: e.target.value }))} className={ic("")}>
                          <option value="Virtual">Virtual</option>
                          <option value="Presencial">Presencial</option>
                          <option value="E-learning">E-learning</option>
                          <option value="Mixto">Mixto</option>
                        </select>
                      </div>
                      <div>
                        <label className={lc}>Duración (horas)</label>
                        <input type="number" min="0" value={form.duracionHrs} onChange={e => setForm(p => ({ ...p, duracionHrs: e.target.value }))} className={ic("")} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={form.obligatorio} onChange={e => setForm(p => ({ ...p, obligatorio: e.target.checked }))} className="w-4 h-4 rounded accent-blue-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-zinc-300">Curso obligatorio</span>
                    </label>
                  </div>
                )}

                {/* ── Materiales Tab ── */}
                {formTab === "materiales" && (
                  <div className="space-y-5">
                    {/* File upload */}
                    <div>
                      <label className={lc}>Subir archivos (PDF, PPT/PPTX)</label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 transition"
                        onClick={() => fileRef.current?.click()}>
                        <input ref={fileRef} type="file" multiple accept=".pdf,.ppt,.pptx" className="hidden" onChange={handleFileUpload} />
                        {uploading ? <p className="text-sm text-blue-500">Subiendo...</p> : (
                          <>
                            <p className="text-sm text-gray-500 dark:text-zinc-400">📎 Haz clic para subir PDF o PowerPoint</p>
                            <p className="text-xs text-gray-400 mt-1">Los empleados podrán descargarlo desde su portal</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Video link */}
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-2">
                      <label className={lc}>🎬 Agregar enlace de video (YouTube, Vimeo, etc.)</label>
                      <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className={ic("")} />
                      <input value={videoNombre} onChange={e => setVideoNombre(e.target.value)} placeholder="Nombre del video (opcional)" className={ic("")} />
                      <button type="button" onClick={addVideo} disabled={!videoUrl.trim()}
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 disabled:opacity-40 transition">
                        Agregar video
                      </button>
                    </div>

                    {/* External link */}
                    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-2">
                      <label className={lc}>🔗 Agregar enlace externo (wiki, drive, etc.)</label>
                      <input value={enlaceUrl} onChange={e => setEnlaceUrl(e.target.value)} placeholder="https://..." className={ic("")} />
                      <input value={enlaceNombre} onChange={e => setEnlaceNombre(e.target.value)} placeholder="Nombre del enlace (opcional)" className={ic("")} />
                      <button type="button" onClick={addEnlace} disabled={!enlaceUrl.trim()}
                        className="rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white text-sm px-4 py-2 disabled:opacity-40 transition">
                        Agregar enlace
                      </button>
                    </div>

                    {/* List */}
                    {form.materiales.length > 0 && (
                      <div>
                        <label className={lc}>Materiales agregados ({form.materiales.length})</label>
                        <div className="space-y-2">
                          {form.materiales.map((m, i) => (
                            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${TIPO_COLOR[m.tipo]}`}>
                              <span className="text-base">{TIPO_ICON[m.tipo]}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{m.nombre}</p>
                                <p className="text-xs opacity-70 truncate">{m.url}</p>
                              </div>
                              <button type="button" onClick={() => removeMaterial(i)} className="text-red-500 hover:text-red-700 shrink-0 text-sm">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {form.materiales.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Aún no hay materiales. Sube archivos o agrega enlaces.</p>}
                  </div>
                )}

                {/* ── Evaluación Tab ── */}
                {formTab === "evaluacion" && (
                  <div className="space-y-5">
                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <div>
                        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Activar evaluación</p>
                        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Los empleados deben completar el quiz para marcar el curso como terminado</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.tieneEvaluacion}
                          onChange={e => setForm(p => ({ ...p, tieneEvaluacion: e.target.checked }))} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                      </label>
                    </div>

                    {form.tieneEvaluacion && (
                      <>
                        {/* Nota aprobatoria */}
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-zinc-700">
                          <label className={lc}>Nota mínima para aprobar: <strong className="text-indigo-600 dark:text-indigo-400">{form.notaAprobatoria}%</strong></label>
                          <input type="range" min={50} max={100} step={5} value={form.notaAprobatoria}
                            onChange={e => setForm(p => ({ ...p, notaAprobatoria: Number(e.target.value) }))}
                            className="w-full accent-indigo-600 mt-2" />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>50%</span><span>70%</span><span>80%</span><span>90%</span><span>100%</span>
                          </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className={lc}>Preguntas ({form.preguntas.length})</label>
                            <div className="flex gap-2 flex-wrap justify-end">
                              {(["seleccion","poll","abierta","escala"] as TipoPregunta[]).map(t => (
                                <button key={t} type="button" onClick={() => setForm(p => ({ ...p, preguntas: [...p.preguntas, newPregunta(t)] }))}
                                  className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1.5 font-medium hover:bg-indigo-100 transition">
                                  + {TIPO_PREGUNTA_LABEL[t].split(" ").slice(1).join(" ")}
                                </button>
                              ))}
                            </div>
                          </div>
                          {form.preguntas.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl">
                              Selecciona un tipo de pregunta arriba para comenzar
                            </div>
                          )}
                          {form.preguntas.map((p, pidx) => (
                            <div key={p.id} className="rounded-xl border border-gray-200 dark:border-zinc-700 p-4 space-y-3">
                              {/* Header row: number + type badge + delete */}
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center">{pidx + 1}</span>
                                <select value={p.tipo} onChange={e => updatePregunta(pidx, "tipo", e.target.value)}
                                  className="text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 focus:outline-none">
                                  {(["seleccion","poll","abierta","escala"] as TipoPregunta[]).map(t => (
                                    <option key={t} value={t}>{TIPO_PREGUNTA_LABEL[t]}</option>
                                  ))}
                                </select>
                                <div className="flex-1" />
                                <button type="button" onClick={() => removePregunta(pidx)}
                                  className="flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-xs px-2.5 py-1 hover:bg-red-100 transition font-medium">
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                  Eliminar
                                </button>
                              </div>
                              {/* Question text */}
                              <input value={p.pregunta} onChange={e => updatePregunta(pidx, "pregunta", e.target.value)}
                                placeholder="Escribe la pregunta aquí..."
                                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-zinc-100" />

                              {/* Options by type */}
                              {(p.tipo === "seleccion" || p.tipo === "poll") && (
                                <div className="space-y-2 pl-2">
                                  <p className="text-xs text-gray-400 dark:text-zinc-500">
                                    {p.tipo === "seleccion" ? "Opciones — clic en el círculo para marcar la correcta:" : "Opciones de encuesta (sin respuesta correcta):"}
                                  </p>
                                  {p.opciones.map((opt, oidx) => (
                                    <div key={opt.id} className={`flex items-center gap-2 rounded-lg p-2 border transition ${opt.correcta ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" : "border-gray-100 dark:border-zinc-800"}`}>
                                      {p.tipo === "seleccion" && (
                                        <button type="button" onClick={() => updateOpcion(pidx, oidx, "correcta", true)}
                                          className={`w-5 h-5 rounded-full border-2 shrink-0 transition ${opt.correcta ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-zinc-600 hover:border-emerald-400"}`}>
                                          {opt.correcta && <span className="flex items-center justify-center w-full h-full text-white text-[10px]">✓</span>}
                                        </button>
                                      )}
                                      {p.tipo === "poll" && (
                                        <span className="w-5 h-5 rounded-full border-2 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 shrink-0 flex items-center justify-center">
                                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                                        </span>
                                      )}
                                      <span className="text-xs font-bold text-gray-400 w-4">{opt.id.toUpperCase()}.</span>
                                      <input value={opt.texto} onChange={e => updateOpcion(pidx, oidx, "texto", e.target.value)}
                                        placeholder={`Opción ${opt.id.toUpperCase()}`}
                                        className="flex-1 bg-transparent text-sm text-gray-800 dark:text-zinc-200 outline-none placeholder:text-gray-300 dark:placeholder:text-zinc-600" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {p.tipo === "abierta" && (
                                <div className="pl-2 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 text-center">
                                  ✏️ El empleado escribirá su respuesta libremente
                                </div>
                              )}
                              {p.tipo === "escala" && (
                                <div className="pl-2">
                                  <p className="text-xs text-gray-400 mb-2">Vista previa de la escala:</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                                      <span key={n} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-zinc-800">{n}</span>
                                    ))}
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>Nada probable</span><span>Muy probable</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex justify-between items-center">
                <div className="flex gap-1">
                  {(["info","materiales","evaluacion"] as FormTab[]).map(ft => (
                    <button key={ft} type="button" onClick={() => setFormTab(ft)}
                      className={`w-2 h-2 rounded-full transition ${formTab === ft ? "bg-blue-600" : "bg-gray-300 dark:bg-zinc-600"}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50">
                    {saving ? "Guardando..." : editCurso ? "Actualizar curso" : "Crear curso"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Asignar empleados ── */}
      {showAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAsignar(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-zinc-700 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Asignar empleados</h2>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{cursos.find(c => c.id === asignarCursoId)?.titulo}</p>
              </div>
              <button onClick={() => setShowAsignar(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-6 pt-4 pb-3 shrink-0">
              <div className="flex rounded-xl bg-gray-100 dark:bg-zinc-800 p-1 gap-1">
                {([
                  { id: "individual",   label: "👤 Individual" },
                  { id: "departamento", label: "🏢 Por departamento" },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => setAsignarMode(m.id)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${asignarMode === m.id ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha límite */}
            <div className="px-6 pb-3 border-b border-gray-100 dark:border-zinc-800 shrink-0">
              <label className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1 block">Fecha límite (opcional)</label>
              <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-zinc-100" />
            </div>

            {/* Counter + select all */}
            <div className="px-6 py-2.5 shrink-0 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                {selectedEmployees.length} empleado{selectedEmployees.length !== 1 ? "s" : ""} seleccionado{selectedEmployees.length !== 1 ? "s" : ""}
              </span>
              <button onClick={() => setSelectedEmployees(selectedEmployees.length === employees.length ? [] : employees.map(e => e.id))}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {selectedEmployees.length === employees.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </button>
            </div>

            {/* ── Individual list ── */}
            {asignarMode === "individual" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                {employees.map(emp => {
                  const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
                  const bc = avatarColor(emp.firstName + emp.lastName);
                  const sel = selectedEmployees.includes(emp.id);
                  return (
                    <label key={emp.id} className={`flex items-center gap-3 rounded-xl p-2.5 cursor-pointer transition ${sel ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "hover:bg-gray-50 dark:hover:bg-zinc-800 border border-transparent"}`}>
                      <input type="checkbox" checked={sel} onChange={() => toggleEmp(emp.id)} className="w-4 h-4 accent-blue-600" />
                      <div className={`w-8 h-8 rounded-lg ${bc} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{initials}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500">{emp.jobTitle ?? emp.department?.name ?? "—"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* ── Department list ── */}
            {asignarMode === "departamento" && (
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-1">
                {deptGroups.map(([dept, emps]) => {
                  const empIds = emps.map(e => e.id);
                  const selCount = empIds.filter(id => selectedEmployees.includes(id)).length;
                  const allSel = selCount === emps.length && emps.length > 0;
                  const partialSel = selCount > 0 && !allSel;
                  return (
                    <div key={dept} className={`rounded-2xl border transition ${allSel ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700" : partialSel ? "border-blue-200 dark:border-blue-900" : "border-gray-200 dark:border-zinc-700"}`}>
                      {/* Dept header */}
                      <div className="p-3 flex items-center gap-3">
                        <input type="checkbox" checked={allSel} onChange={() => toggleDept(empIds)} className="w-4 h-4 accent-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">{dept}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500">
                            {emps.length} empleado{emps.length !== 1 ? "s" : ""}
                            {selCount > 0 && <span className="text-blue-500 dark:text-blue-400"> · {selCount} seleccionado{selCount !== 1 ? "s" : ""}</span>}
                          </p>
                        </div>
                        <button onClick={() => toggleDept(empIds)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition shrink-0 ${allSel ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200" : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-600"}`}>
                          {allSel ? "✓ Todo" : partialSel ? `+${emps.length - selCount} más` : "Seleccionar"}
                        </button>
                      </div>
                      {/* Employee avatar pills */}
                      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                        {emps.map(emp => {
                          const sel = selectedEmployees.includes(emp.id);
                          const bc = avatarColor(emp.firstName + emp.lastName);
                          return (
                            <button key={emp.id} type="button" onClick={() => toggleEmp(emp.id)}
                              title={`${emp.firstName} ${emp.lastName}${emp.jobTitle ? ` · ${emp.jobTitle}` : ""}`}
                              className={`inline-flex items-center gap-1.5 rounded-lg pl-1 pr-2 py-1 text-xs font-medium transition ring-1 ${sel ? `${bc} text-white ring-blue-400` : "bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300 ring-gray-200 dark:ring-zinc-600 hover:bg-gray-200 dark:hover:bg-zinc-600"}`}>
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${sel ? "bg-white/20" : "bg-gray-200 dark:bg-zinc-600"} text-[10px] font-bold`}>
                                {emp.firstName[0]}{emp.lastName[0]}
                              </span>
                              {emp.firstName} {emp.lastName.split(" ")[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 shrink-0 flex gap-3">
              <button onClick={() => setShowAsignar(false)} className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition">Cancelar</button>
              <button onClick={doAsignar} disabled={assigning || !selectedEmployees.length}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50">
                {assigning ? "Asignando..." : `Asignar ${selectedEmployees.length > 0 ? `(${selectedEmployees.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Certificado ── */}
      {certData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCertData(null)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden">

            {/* Success banner */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 text-white text-center">
              <div className="flex justify-center mb-2">
                <svg className="w-12 h-12 opacity-90" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </div>
              <h2 className="text-xl font-bold">¡Curso completado!</h2>
              <p className="text-emerald-100 text-sm mt-1">El certificado ha sido acreditado al perfil del colaborador</p>
            </div>

            {/* Certificate preview */}
            <div className="p-6">
              <div className="relative border-4 border-double border-blue-800 dark:border-blue-600 rounded-lg p-8 text-center bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-zinc-900">
                {/* Corner decorations */}
                <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-blue-800 dark:border-blue-600" />
                <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-blue-800 dark:border-blue-600" />
                <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-blue-800 dark:border-blue-600" />
                <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-blue-800 dark:border-blue-600" />

                <p className="text-[10px] text-gray-400 uppercase tracking-[4px] font-medium mb-2">Sistema de Recursos Humanos</p>
                <div className="w-12 h-0.5 bg-blue-800 dark:bg-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 tracking-widest uppercase mb-4">Certificado de Completación</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">Por medio del presente se certifica que</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white border-b-2 border-blue-800 dark:border-blue-500 pb-2 mb-1 inline-block min-w-[260px]">
                  {certData.employeeName}
                </p>
                {certData.jobTitle && <p className="text-xs text-gray-400 italic mt-1 mb-3">{certData.jobTitle}</p>}
                {!certData.jobTitle && <div className="mb-3" />}
                <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">ha completado satisfactoriamente el curso:</p>
                <p className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-5">{certData.courseName}</p>

                <div className="flex justify-center gap-8 text-center mb-6 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{CAT_LABEL[certData.categoria]}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Categoría</p>
                  </div>
                  {certData.duracionHrs && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{certData.duracionHrs} horas</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Duración</p>
                    </div>
                  )}
                  {certData.modalidad && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{certData.modalidad}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Modalidad</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(certData.fechaCompletado).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Fecha de completación</p>
                  </div>
                </div>

                <div className="w-36 border-t border-gray-300 dark:border-zinc-600 mx-auto pt-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Recursos Humanos</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setCertData(null)}
                  className="flex-1 rounded-xl border border-gray-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                  Cerrar
                </button>
                <button onClick={printCertificate}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Imprimir / Guardar PDF
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 dark:text-zinc-500 mt-3">
                Al imprimir, selecciona "Guardar como PDF" en el diálogo de impresión para descargar el certificado
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Resultados de evaluación ── */}
      {resultadosCursoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResultadosCursoId(null)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-zinc-700 max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resultados de evaluación</h2>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">{cursos.find(c => c.id === resultadosCursoId)?.titulo}</p>
              </div>
              <button onClick={() => setResultadosCursoId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingRes ? (
                <p className="text-center text-gray-400 py-8">Cargando...</p>
              ) : resultados.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-3">
                    <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <p className="text-sm text-gray-400">Aún no hay resultados de evaluación para este curso.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resultados.map(r => (
                    <div key={r.id} className={`rounded-xl p-4 border ${r.aprobado ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{r.employee.firstName} {r.employee.lastName}</p>
                          <p className="text-xs text-gray-400 dark:text-zinc-500">{r.employee.jobTitle ?? ""} · Intento #{r.intento}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${r.aprobado ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{r.puntaje}%</p>
                          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${r.aprobado ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                            {r.aprobado ? "✓ Aprobado" : "✗ No aprobado"}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{new Date(r.createdAt).toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
