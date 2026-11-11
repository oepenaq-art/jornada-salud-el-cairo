"use client";

import React from "react";
import { Patient } from "../types/medical";
import { cleanMojibake, getCanonicalSpecialty } from "../lib/normalize";
import { Printer, Share2, X, CheckSquare, Square, Stethoscope } from "lucide-react";

interface Props {
  patient: Patient;
  onClose: () => void;
}

export default function PrintableReferralModal({ patient, onClose }: Props) {
  const note = patient.analisisEstructurado;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const flags = [
      patient.requiereSeguimiento ? "Seguimiento" : "",
      patient.requiereExamenes ? "Exámenes" : "",
      patient.requiereRemision ? "Remisión" : "",
    ]
      .filter(Boolean)
      .join(" + ");

    const text = `*FUNDACIÓN TEJAS PARA MI PUEBLO*
*Jornada de Salud - El Cairo, Valle del Cauca*
----------------------------------
*Paciente:* ${cleanMojibake(patient.nombre)}
*Identificación:* ${patient.tipoDocumento || "CC"} ${patient.documento || "Sin número"} (${patient.edad} años)
*Teléfono:* ${patient.telefono || "No registrado"}
*Especialidad:* ${getCanonicalSpecialty(patient.especialidad)}
*Procedencia:* ${cleanMojibake(patient.veredaBarrio || "El Cairo")}
*Conducta Requerida:* ${flags || "Valoración realizada"}
${patient.detalleDestino ? `*Detalle / Destino:* ${patient.detalleDestino}\n` : ""}----------------------------------
*1. ENFERMEDAD ACTUAL:*
${note?.enfermedadActual || "N/A"}

*2. ANTECEDENTES:*
${note?.antecedentes || "N/A"}

*3. EXAMEN FÍSICO:*
${note?.examenFisico || "N/A"}

*4. IMPRESIÓN DIAGNÓSTICA:*
${note?.impresionDiagnostica || "N/A"}

*5. PLAN Y JUSTIFICACIÓN:*
${note?.planYJustificacion || "N/A"}
----------------------------------
*Profesional Tratante:* ${patient.medicoAtendio || "Profesional de la Jornada"}
*Fecha de Atención:* ${patient.fechaAtencion || new Date().toLocaleString("es-CO")}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col print:max-h-none print:shadow-none print:my-0 print:rounded-none">
        {/* Barra superior de control (NO se imprime) */}
        <div className="bg-pueblo-900 text-white px-4 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-teja-600 text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
              Documento Oficial
            </span>
            <span className="font-bold text-sm truncate">
              Orden y Resumen Clínico • {cleanMojibake(patient.nombre)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
              title="Compartir por WhatsApp al paciente o acudiente"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-teja-600 hover:bg-teja-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm"
              title="Imprimir documento o Guardar como PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
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

        {/* DOCUMENTO IMPRIMIBLE CON ESTILO Y COLORES INSTITUCIONALES */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-4 text-gray-800 print:p-0 print:overflow-visible">
          {/* Cinta decorativa cultural inspirada en El Cairo */}
          <div
            className="h-2 w-full rounded-full"
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
                {note?.enfermedadActual || "Sin registro especificado."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-700 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              <h3 className="font-extrabold text-pueblo-900 uppercase text-[10px] tracking-wide">
                2. Antecedentes Relevantes (Patológicos, Farmacológicos, Quirúrgicos, Alérgicos)
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line font-medium">
                {note?.antecedentes || "Sin antecedentes patológicos reportados."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-700 pl-3 py-1 bg-gray-50/50 rounded-r-lg">
              <h3 className="font-extrabold text-pueblo-900 uppercase text-[10px] tracking-wide">
                3. Hallazgos al Examen Físico y Signos Vitales
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line font-medium">
                {note?.examenFisico || "Evaluación física realizada en consultorio de brigada."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-1 bg-teja-50/40 rounded-r-lg">
              <h3 className="font-extrabold text-teja-800 uppercase text-[10px] tracking-wide">
                4. Impresión Diagnóstica
              </h3>
              <p className="text-gray-900 font-bold mt-0.5 whitespace-pre-line">
                {note?.impresionDiagnostica || "Diagnóstico clínico en valoración."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-1.5 bg-teja-50/60 rounded-r-lg">
              <h3 className="font-extrabold text-teja-900 uppercase text-[10px] tracking-wide">
                5. Plan de Manejo, Tratamiento y Justificación Clínica
              </h3>
              <p className="text-gray-900 mt-0.5 whitespace-pre-line font-medium">
                {note?.planYJustificacion || "Indicaciones y plan formulados por el profesional."}
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
