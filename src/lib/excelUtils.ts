import * as XLSX from "xlsx";
import { Doctor, Patient } from "../types/medical";

/**
 * Exporta todos los pacientes y sus análisis estructurados a un archivo Excel (.xlsx)
 * listo para el seguimiento de la Fundación "Tejas para mi Pueblo"
 */
export function exportJornadaToExcel(patients: Patient[]) {
  const rows = patients.map((p, idx) => ({
    "No.": idx + 1,
    "Estado Atención":
      p.estado === "atendido"
        ? "ATENDIDO"
        : p.estado === "pendiente_ia"
        ? "AUDIO PENDIENTE IA"
        : "PENDIENTE",
    "Especialidad": p.especialidad,
    "Tipo Doc": p.tipoDocumento,
    "Documento": p.documento,
    "Nombre Completo": p.nombre,
    "Edad": p.edad,
    "Sexo": p.sexo,
    "Teléfono": p.telefono || "",
    "Vereda / Barrio (El Cairo)": p.veredaBarrio || "",
    "Requiere Seguimiento": p.requiereSeguimiento ? "SÍ" : "NO",
    "Requiere Exámenes": p.requiereExamenes ? "SÍ" : "NO",
    "Requiere Remisión": p.requiereRemision ? "SÍ" : "NO",
    "Destino / Exámenes Solicitados": p.detalleDestino || "",
    "Médico que Atendió": p.medicoAtendio || "",
    "Fecha y Hora": p.fechaAtencion || "",
    "1. Enfermedad Actual": p.analisisEstructurado?.enfermedadActual || "",
    "2. Antecedentes Relevantes": p.analisisEstructurado?.antecedentes || "",
    "3. Hallazgos Examen Físico": p.analisisEstructurado?.examenFisico || "",
    "4. Impresión Diagnóstica (CIE-10)":
      p.analisisEstructurado?.impresionDiagnostica || "",
    "5. Plan y Justificación de Remisión/Exámenes":
      p.analisisEstructurado?.planYJustificacion || "",
    "Resumen Ejecutivo": p.analisisEstructurado?.resumenEjecutivo || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pacientes Jornada El Cairo");

  // Ajustar ancho de columnas
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 20 },
    { wch: 8 },
    { wch: 15 },
    { wch: 30 },
    { wch: 8 },
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 35 },
    { wch: 25 },
    { wch: 18 },
    { wch: 50 },
    { wch: 40 },
    { wch: 45 },
    { wch: 35 },
    { wch: 55 },
    { wch: 40 },
  ];

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(
    workbook,
    `Consolidado_Jornada_El_Cairo_TejasParaMiPueblo_${dateStr}.xlsx`
  );
}

/**
 * Descarga una plantilla en blanco / ejemplo para cargar pacientes y médicos desde Excel
 */
export function downloadTemplateExcel() {
  const samplePatients = [
    {
      TipoDoc: "CC",
      Documento: "6284999",
      Nombre: "Pedro Antonio Gallego",
      Edad: 64,
      Sexo: "M",
      Telefono: "3120001122",
      VeredaBarrio: "Vereda Miravalles",
      Especialidad: "Medicina General",
      MotivoConsulta: "Dolor articular y control de tensión",
    },
    {
      TipoDoc: "TI",
      Documento: "1114555888",
      Nombre: "Valeria Restrepo",
      Edad: 9,
      Sexo: "F",
      Telefono: "3104445566",
      VeredaBarrio: "Cabecera Municipal",
      Especialidad: "Pediatría",
      MotivoConsulta: "Control de crecimiento y desarrollo",
    },
  ];

  const sampleDoctors = [
    {
      Nombre: "Dr. Juan Pablo Montoya",
      Documento: "76001234",
      Especialidad: "Medicina General",
      RegistroMedico: "RM-76001",
    },
    {
      Nombre: "Dra. Camila Vélez",
      Documento: "1114555000",
      Especialidad: "Pediatría",
      RegistroMedico: "RM-76002",
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsPacientes = XLSX.utils.json_to_sheet(samplePatients);
  const wsMedicos = XLSX.utils.json_to_sheet(sampleDoctors);

  XLSX.utils.book_append_sheet(wb, wsPacientes, "Pacientes");
  XLSX.utils.book_append_sheet(wb, wsMedicos, "Medicos");

  XLSX.writeFile(wb, "Plantilla_Carga_Jornada_El_Cairo.xlsx");
}

/**
 * Procesa un archivo Excel (.xlsx / .csv) subido por el coordinador
 * extrayendo pacientes y opcionalmente médicos
 */
export async function parseExcelFile(
  file: File
): Promise<{ patients: Patient[]; doctors: Doctor[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const patients: Patient[] = [];
  const doctors: Doctor[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    const lowerSheet = sheetName.toLowerCase();

    if (lowerSheet.includes("medico") || lowerSheet.includes("médico") || lowerSheet.includes("doctor")) {
      rows.forEach((r, i) => {
        const nombre = String(
          r["Nombre"] || r["nombre"] || r["Medico"] || r["Médico"] || ""
        ).trim();
        const documento = String(
          r["Documento"] || r["documento"] || r["CC"] || r["Cedula"] || r["Cédula"] || ""
        ).trim();
        const especialidad = String(
          r["Especialidad"] || r["especialidad"] || "Medicina General"
        ).trim();
        const registro = String(
          r["RegistroMedico"] || r["Registro"] || r["RM"] || ""
        ).trim();
        if (nombre) {
          doctors.push({
            id: `med-imp-${Date.now()}-${i}`,
            nombre,
            documento,
            especialidad,
            registroMedico: registro,
          });
        }
      });
    } else {
      rows.forEach((r, i) => {
        const nombre = String(
          r["Nombre"] ||
            r["Nombre Completo"] ||
            r["nombre"] ||
            r["PACIENTE"] ||
            r["Paciente"] ||
            ""
        ).trim();
        if (!nombre) return;

        const documento = String(
          r["Documento"] ||
            r["Cedula"] ||
            r["Cédula"] ||
            r["ID"] ||
            r["Identificacion"] ||
            `S/D-${i + 1}`
        ).trim();

        const rawTipo = String(r["TipoDoc"] || r["Tipo Doc"] || "CC")
          .toUpperCase()
          .trim();
        const tipoDocumento = (
          ["CC", "TI", "RC", "CE", "PT"].includes(rawTipo) ? rawTipo : "CC"
        ) as Patient["tipoDocumento"];

        const edad = Number(r["Edad"] || r["edad"] || 30) || 30;
        const rawSexo = String(r["Sexo"] || r["Genero"] || "F")
          .toUpperCase()
          .trim();
        const sexo: Patient["sexo"] = rawSexo.startsWith("M")
          ? "M"
          : rawSexo.startsWith("F")
          ? "F"
          : "Otro";

        const especialidad = String(
          r["Especialidad"] ||
            r["especialidad"] ||
            r["Servicio"] ||
            "Medicina General"
        ).trim();

        const veredaBarrio = String(
          r["VeredaBarrio"] ||
            r["Vereda"] ||
            r["Barrio"] ||
            r["Direccion"] ||
            "El Cairo"
        ).trim();

        const telefono = String(
          r["Telefono"] || r["Teléfono"] || r["Celular"] || ""
        ).trim();

        const motivoInicial = String(
          r["MotivoConsulta"] ||
            r["Motivo"] ||
            r["Observaciones"] ||
            "Valoración en jornada de salud"
        ).trim();

        patients.push({
          id: `pac-imp-${Date.now()}-${i}`,
          tipoDocumento,
          documento,
          nombre,
          edad,
          sexo,
          telefono,
          veredaBarrio,
          especialidad,
          motivoInicial,
          estado: "pendiente",
          requiereSeguimiento: false,
          requiereExamenes: false,
          requiereRemision: false,
        });
      });
    }
  }

  return { patients, doctors };
}
