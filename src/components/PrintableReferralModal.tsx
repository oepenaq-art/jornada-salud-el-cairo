"use client";

import React, { useState } from "react";
import { Patient } from "../types/medical";
import { cleanMojibake, getCanonicalSpecialty } from "../lib/normalize";
import {
  Printer,
  Share2,
  X,
  CheckSquare,
  Square,
  Stethoscope,
  FileDown,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface Props {
  patient: Patient;
  onClose: () => void;
}

export default function PrintableReferralModal({ patient, onClose }: Props) {
  const note = patient.analisisEstructurado;
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // Carga dinámica de html2canvas con fallback a CDN
  const getHtml2Canvas = async () => {
    try {
      // @ts-ignore
      const mod = await import("html2canvas");
      return mod.default || mod;
    } catch {
      if (typeof window !== "undefined" && !(window as any).html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      // @ts-ignore
      return (window as any).html2canvas;
    }
  };

  // Carga dinámica de jsPDF con fallback a CDN
  const getJsPdf = async () => {
    try {
      // @ts-ignore
      const mod = await import("jspdf");
      return mod.jsPDF || mod.default || mod;
    } catch {
      if (typeof window !== "undefined" && !(window as any).jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      // @ts-ignore
      return (window as any).jspdf?.jsPDF || (window as any).jsPDF;
    }
  };

  const buildShareUrl = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://jornada-salud-el-cairo-inky.vercel.app";
    return `${origin}/?orden=${patient.id}`;
  };

  const getWhatsAppMessageText = (fileDownloaded = false) => {
    const flags = [
      patient.requiereSeguimiento ? "Seguimiento" : "",
      patient.requiereExamenes ? "Exámenes" : "",
      patient.requiereRemision ? "Remisión" : "",
    ]
      .filter(Boolean)
      .join(" + ");

    const docLink = buildShareUrl();

    return `*FUNDACIÓN TEJAS PARA MI PUEBLO*
*Jornada de Salud • El Cairo, Valle del Cauca*
━━━━━━━━━━━━━━━━━━━━━━━━━
📄 *ORDEN MÉDICA Y RESUMEN CLÍNICO (PDF OFICIAL)*
*Paciente:* ${cleanMojibake(patient.nombre)}
*Identificación:* ${patient.tipoDocumento || "CC"} ${patient.documento || "Sin número"} (${patient.edad} años)
*Especialidad:* ${getCanonicalSpecialty(patient.especialidad)}
*Procedencia:* ${cleanMojibake(patient.veredaBarrio || "El Cairo")}
*Conducta Requerida:* ${flags || "Valoración realizada"}
${patient.detalleDestino ? `*Detalle / Destino:* ${patient.detalleDestino}\n` : ""}
🔗 *Ver y Descargar Documento Oficial en PDF con Logo y Firma:*
${docLink}
━━━━━━━━━━━━━━━━━━━━━━━━━
*1. ENFERMEDAD ACTUAL:*
${note?.enfermedadActual || "Sin información relevante"}

*2. ANTECEDENTES:*
${note?.antecedentes?.trim() || "Sin información relevante"}

*3. EXAMEN FÍSICO:*
${note?.examenFisico?.trim() || "Sin información relevante"}

*4. IMPRESIÓN DIAGNÓSTICA:*
${note?.impresionDiagnostica || "Sin información relevante"}

*5. PLAN Y JUSTIFICACIÓN:*
${note?.planYJustificacion || "Sin información relevante"}
━━━━━━━━━━━━━━━━━━━━━━━━━
*Profesional Tratante:* ${patient.medicoAtendio || "Profesional de la Jornada"}
*Fecha de Atención:* ${patient.fechaAtencion || new Date().toLocaleString("es-CO")}
${fileDownloaded ? "\n📎 *Se ha generado el documento oficial en formato PDF listo para descargar o consultar.*" : ""}`;
  };

  // Generador de archivo PDF real (application/pdf)
  const generatePdfBlob = async (): Promise<{ blob: Blob; fileName: string } | null> => {
    const element = document.getElementById("printable-document-content");
    if (!element) return null;

    const html2canvas = await getHtml2Canvas();
    const JsPDFClass = await getJsPdf();
    if (!html2canvas || !JsPDFClass) return null;

    // Capturar en canvas con escala 2x para nitidez de impresión
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new JsPDFClass({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297 mm
    const margin = 8; // 8 mm margen
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    if (contentHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, contentHeight);
    } else {
      // Si la nota clínica es muy extensa, paginar adecuadamente
      let heightLeft = contentHeight;
      let position = margin;

      pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, position, contentWidth, contentHeight);
        heightLeft -= pageHeight;
      }
    }

    const cleanName = cleanMojibake(patient.nombre).replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Orden_Medica_${cleanName}_TejasParaMiPueblo.pdf`;
    const pdfBlob = pdf.output("blob");

    return { blob: pdfBlob, fileName };
  };

  // Descarga directa del documento como archivo PDF auténtico (.pdf)
  const handleDownloadPdf = async () => {
    setIsGeneratingDoc(true);
    try {
      const res = await generatePdfBlob();
      if (!res) {
        window.print();
        return;
      }
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setGeneratedSuccess(true);
      setTimeout(() => setGeneratedSuccess(false), 3000);
    } catch (err) {
      console.error("Error descargando PDF:", err);
      window.print();
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Compartir por WhatsApp creando y adjuntando el documento PDF
  const handleShareWhatsApp = async () => {
    setIsGeneratingDoc(true);
    try {
      const res = await generatePdfBlob();

      // 1. Si estamos en celular (Android / iOS) con soporte para compartir archivos PDF directamente
      if (
        res &&
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare
      ) {
        const file = new File([res.blob], res.fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Orden Médica Oficial (PDF) - ${cleanMojibake(patient.nombre)}`,
              text: getWhatsAppMessageText(true),
            });
            setIsGeneratingDoc(false);
            return;
          } catch {
            // Si el usuario canceló el selector nativo
            setIsGeneratingDoc(false);
            return;
          }
        }
      }

      // 2. Si no soporta compartir archivo directo (ej. navegador de escritorio):
      // Descargamos el archivo .pdf y abrimos WhatsApp con el mensaje estructurado y link directo
      if (res) {
        const url = URL.createObjectURL(res.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      const text = getWhatsAppMessageText(true);
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    } catch (err) {
      console.error("Error compartiendo por WhatsApp:", err);
      const text = getWhatsAppMessageText(false);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  return (
    <div
      id="printable-modal-overlay"
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible"
    >
      <div
        id="printable-document-root"
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col print:max-h-none print:shadow-none print:my-0 print:rounded-none print:w-full print:static"
      >
        {/* Barra superior de control (NUNCA se imprime) */}
        <div className="bg-pueblo-900 text-white px-3 sm:px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-teja-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0">
              PDF Oficial
            </span>
            <span className="font-bold text-xs sm:text-sm truncate">
              {cleanMojibake(patient.nombre)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón Descargar PDF Oficial (.pdf) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingDoc}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3 py-1.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-75"
              title="Descargar documento oficial en formato PDF (.pdf)"
            >
              <FileDown className="w-4 h-4 text-white" />
              <span>Descargar PDF</span>
            </button>

            {/* Botón WhatsApp (Genera el PDF y lo envía) */}
            <button
              onClick={handleShareWhatsApp}
              disabled={isGeneratingDoc}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-75"
              title="Crear documento PDF y enviar por WhatsApp"
            >
              {isGeneratingDoc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creando PDF...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </>
              )}
            </button>

            {/* Botón Imprimir */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-teja-600 hover:bg-teja-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition shadow-sm active:scale-95"
              title="Imprimir documento oficial en 1 página"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-xl transition"
              title="Cerrar vista"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de confirmación de descarga de PDF */}
        {generatedSuccess && (
          <div className="bg-emerald-100 border-b border-emerald-300 text-emerald-900 px-4 py-1.5 text-xs font-bold flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Documento PDF oficial descargado exitosamente.
            </span>
          </div>
        )}

        {/* DOCUMENTO IMPRIMIBLE CON ESTILO Y COLORES INSTITUCIONALES */}
        <div
          id="printable-document-content"
          className="p-5 sm:p-8 overflow-y-auto space-y-4 text-gray-800 bg-white print:p-0 print:overflow-visible"
        >
          {/* Cinta decorativa cultural inspirada en El Cairo */}
          <div
            className="h-2.5 w-full rounded-full"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #d25427 0%, #FACC15 25%, #38BDF8 50%, #356530 75%, #d25427 100%)",
            }}
          />

          {/* Encabezado con Logo Oficial de la Fundación y Títulos */}
          <div className="flex items-center justify-between border-b-2 border-teja-600 pb-3 gap-3">
            <div className="flex items-center gap-3.5">
              <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm shrink-0">
                <img
                  src="/images/logo-tejas.png"
                  alt="Fundación Tejas para mi Pueblo"
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>
              <div>
                <span className="inline-block bg-pueblo-100 text-pueblo-900 border border-pueblo-200 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md mb-0.5">
                  Jornada de Salud Rural • El Cairo, Valle
                </span>
                <h1 className="text-base sm:text-lg font-black text-pueblo-900 uppercase tracking-tight leading-tight">
                  Fundación Tejas para mi Pueblo
                </h1>
                <p className="text-xs font-extrabold text-teja-700 uppercase">
                  Resumen de Historia Clínica y Orden Médica
                </p>
                <p className="text-[10px] text-gray-500">
                  Formato Oficial de Referencia, Exámenes Paraclínicos y Seguimiento
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-gray-600 shrink-0 bg-gray-50 border border-gray-200 p-2 rounded-xl">
              <p className="font-extrabold text-gray-800">Fecha de Atención:</p>
              <p className="font-semibold text-pueblo-800">
                {patient.fechaAtencion || new Date().toLocaleString("es-CO")}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Folio: <strong className="text-teja-700">{patient.id.toUpperCase()}</strong>
              </p>
            </div>
          </div>

          {/* Ficha de Identificación del Paciente */}
          <div className="bg-gradient-to-r from-pueblo-50/60 via-white to-teja-50/60 border border-pueblo-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Paciente:
              </span>
              <span className="font-extrabold text-gray-900 text-sm leading-tight block">
                {cleanMojibake(patient.nombre)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Identificación:
              </span>
              <span className="font-bold text-gray-900">
                {patient.tipoDocumento || "CC"} {patient.documento || "Sin número"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Edad / Sexo:
              </span>
              <span className="font-bold text-gray-900">
                {patient.edad} años ({patient.sexo || "No especificado"})
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Teléfono de Contacto:
              </span>
              <span className="font-semibold text-gray-800">
                {patient.telefono && patient.telefono !== "0" && patient.telefono.trim() !== ""
                  ? patient.telefono
                  : "No registrado"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Especialidad / Servicio:
              </span>
              <span className="font-extrabold text-pueblo-800">
                {getCanonicalSpecialty(patient.especialidad)}
              </span>
            </div>
            <div>
              <span className="text-gray-500 text-[10px] uppercase font-bold block">
                Vereda / Municipio:
              </span>
              <span className="font-semibold text-gray-800">
                {cleanMojibake(patient.veredaBarrio || "El Cairo, Valle del Cauca")}
              </span>
            </div>
          </div>

          {/* Conducta requerida posterior a la jornada */}
          <div className="border border-teja-300 bg-teja-50/50 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-teja-800 tracking-wider mb-1.5 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-teja-600" />
              Conducta y Requerimientos Clínicos Posteriores:
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                {patient.requiereSeguimiento ? (
                  <CheckSquare className="w-4 h-4 text-amber-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span className={patient.requiereSeguimiento ? "text-amber-900" : "text-gray-500"}>
                  Requiere Seguimiento
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {patient.requiereExamenes ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span className={patient.requiereExamenes ? "text-blue-900" : "text-gray-500"}>
                  Solicitud de Exámenes
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {patient.requiereRemision ? (
                  <CheckSquare className="w-4 h-4 text-red-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span className={patient.requiereRemision ? "text-red-900 font-extrabold" : "text-gray-500"}>
                  Remisión Prioritaria
                </span>
              </div>
            </div>
            {patient.detalleDestino && (
              <p className="mt-2 text-xs text-gray-900 border-t border-teja-200 pt-1.5">
                <strong className="text-teja-900">Destino / Paraclínicos Solicitados:</strong>{" "}
                {patient.detalleDestino}
              </p>
            )}
          </div>

          {/* Cuerpo del Análisis Clínico Estructurado */}
          <div className="space-y-2.5 text-xs leading-relaxed">
            <div className="border-l-4 border-pueblo-700 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              <h3 className="font-extrabold text-pueblo-900 uppercase text-[10px] tracking-wide">
                1. Enfermedad Actual y Motivo de Consulta
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line font-medium">
                {note?.enfermedadActual || "Sin información relevante."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-700 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              <h3 className="font-extrabold text-pueblo-900 uppercase text-[10px] tracking-wide">
                2. Antecedentes Relevantes (Patológicos, Farmacológicos, Quirúrgicos, Alérgicos)
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line font-medium">
                {note?.antecedentes?.trim() ? note.antecedentes : "Sin información relevante."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-700 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              <h3 className="font-extrabold text-pueblo-900 uppercase text-[10px] tracking-wide">
                3. Hallazgos al Examen Físico y Signos Vitales
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line font-medium">
                {note?.examenFisico?.trim() ? note.examenFisico : "Sin información relevante."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-1 bg-teja-50/40 rounded-r-lg">
              <h3 className="font-extrabold text-teja-800 uppercase text-[10px] tracking-wide">
                4. Impresión Diagnóstica
              </h3>
              <p className="text-gray-900 font-bold mt-0.5 whitespace-pre-line">
                {note?.impresionDiagnostica || "Sin información relevante."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-1.5 bg-teja-50/60 rounded-r-lg">
              <h3 className="font-extrabold text-teja-900 uppercase text-[10px] tracking-wide">
                5. Plan de Manejo, Tratamiento y Justificación Clínica
              </h3>
              <p className="text-gray-900 mt-0.5 whitespace-pre-line font-medium">
                {note?.planYJustificacion || "Sin información relevante."}
              </p>
            </div>
          </div>

          {/* Bloque de Firma y Validación Profesional */}
          <div className="pt-6 mt-4 border-t border-gray-200 flex justify-between items-end text-xs">
            <div>
              <div className="w-60 border-b border-gray-500 mb-1"></div>
              <p className="font-extrabold text-gray-900 text-sm">
                {patient.medicoAtendio || "Profesional de la Salud"}
              </p>
              <p className="text-gray-600 text-[11px] font-semibold">
                Especialidad: {getCanonicalSpecialty(patient.especialidad)}
              </p>
              {patient.medicoDocumento && (
                <p className="text-gray-500 text-[10px]">
                  Identificación: CC {patient.medicoDocumento}
                </p>
              )}
            </div>

            <div className="text-right text-[10px] text-gray-500 max-w-[200px] leading-tight">
              <p className="font-bold text-pueblo-900">Fundación Tejas para mi Pueblo</p>
              <p>Por la salud, bienestar y dignidad del campesinado colombiano</p>
              <p className="text-teja-700 font-semibold mt-0.5">El Cairo • Valle del Cauca</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
