"use client";

import React from "react";
import { Patient } from "../types/medical";
import { Printer, Share2, X, CheckSquare, Square } from "lucide-react";

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
*Paciente:* ${patient.nombre}
*Doc:* ${patient.tipoDocumento} ${patient.documento} (${patient.edad} años)
*Especialidad:* ${patient.especialidad}
*Conducta:* ${flags || "Valoración"}
${patient.detalleDestino ? `*Detalle:* ${patient.detalleDestino}\n` : ""}----------------------------------
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
*Atendido por:* ${patient.medicoAtendio || "Médico de la Jornada"}
*Fecha:* ${patient.fechaAtencion || new Date().toLocaleDateString("es-CO")}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Barra superior de acciones (no se imprime) */}
        <div className="bg-pueblo-700 text-white px-4 py-3 flex items-center justify-between print:hidden">
          <span className="font-semibold text-sm">
            Orden de Remisión / Resumen Clínico
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-teja-600 hover:bg-teja-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento imprimible */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-4 text-gray-800 print:p-0">
          {/* Encabezado con Logo */}
          <div className="flex items-center justify-between border-b-2 border-teja-600 pb-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/logo-tejas.png"
                alt="Fundación Tejas para mi Pueblo"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-lg font-extrabold text-pueblo-700 uppercase leading-tight">
                  Fundación Tejas para mi Pueblo
                </h1>
                <p className="text-xs font-semibold text-teja-600">
                  Jornada Especial de Salud • El Cairo, Valle del Cauca
                </p>
                <p className="text-[11px] text-gray-500">
                  Formato de Referencia, Solicitud de Exámenes y Seguimiento Clínico
                </p>
              </div>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p className="font-bold text-gray-800">Fecha de Atención:</p>
              <p>{patient.fechaAtencion || new Date().toLocaleString("es-CO")}</p>
            </div>
          </div>

          {/* Datos de identificación del paciente */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500 block">Paciente:</span>
              <span className="font-bold text-gray-900 text-sm">{patient.nombre}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Identificación:</span>
              <span className="font-bold text-gray-900">
                {patient.tipoDocumento} {patient.documento}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Edad / Sexo:</span>
              <span className="font-bold text-gray-900">
                {patient.edad} años ({patient.sexo})
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Vereda / Barrio:</span>
              <span className="font-semibold text-gray-800">
                {patient.veredaBarrio || "El Cairo"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Teléfono:</span>
              <span className="font-semibold text-gray-800">
                {patient.telefono || "No registrado"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Especialidad:</span>
              <span className="font-bold text-pueblo-700">{patient.especialidad}</span>
            </div>
          </div>

          {/* Conducta requerida */}
          <div className="border border-teja-200 bg-teja-50/60 rounded-xl p-3">
            <p className="text-[11px] font-bold uppercase text-teja-800 mb-2">
              Requerimiento Posterior a la Jornada:
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                {patient.requiereSeguimiento ? (
                  <CheckSquare className="w-4 h-4 text-teja-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>Requiere Seguimiento</span>
              </div>
              <div className="flex items-center gap-1.5">
                {patient.requiereExamenes ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>Solicitud de Exámenes</span>
              </div>
              <div className="flex items-center gap-1.5">
                {patient.requiereRemision ? (
                  <CheckSquare className="w-4 h-4 text-red-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span>Remisión a Especialidad</span>
              </div>
            </div>
            {patient.detalleDestino && (
              <p className="mt-2 text-xs text-gray-800 border-t border-teja-200 pt-1.5">
                <strong>Detalle / Destino:</strong> {patient.detalleDestino}
              </p>
            )}
          </div>

          {/* Cuerpo del Análisis Clínico Estructurado */}
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="border-l-4 border-pueblo-600 pl-3 py-0.5">
              <h3 className="font-bold text-pueblo-800 uppercase text-[11px]">
                1. Enfermedad Actual
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                {note?.enfermedadActual || "Sin registro."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-600 pl-3 py-0.5">
              <h3 className="font-bold text-pueblo-800 uppercase text-[11px]">
                2. Antecedentes Relevantes
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                {note?.antecedentes || "Sin registro."}
              </p>
            </div>

            <div className="border-l-4 border-pueblo-600 pl-3 py-0.5">
              <h3 className="font-bold text-pueblo-800 uppercase text-[11px]">
                3. Hallazgos al Examen Físico
              </h3>
              <p className="text-gray-800 mt-0.5 whitespace-pre-line">
                {note?.examenFisico || "Sin registro."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-0.5 bg-gray-50 rounded-r-lg">
              <h3 className="font-bold text-teja-800 uppercase text-[11px]">
                4. Impresión Diagnóstica
              </h3>
              <p className="text-gray-900 font-semibold mt-0.5 whitespace-pre-line">
                {note?.impresionDiagnostica || "Sin registro."}
              </p>
            </div>

            <div className="border-l-4 border-teja-600 pl-3 py-1 bg-teja-50/40 rounded-r-lg">
              <h3 className="font-bold text-teja-800 uppercase text-[11px]">
                5. Plan de Manejo y Justificación Clínica de Remisión / Exámenes
              </h3>
              <p className="text-gray-900 mt-0.5 whitespace-pre-line">
                {note?.planYJustificacion || "Sin registro."}
              </p>
            </div>
          </div>

          {/* Firma del Médico */}
          <div className="pt-8 mt-6 border-t border-gray-200 flex justify-between items-end text-xs">
            <div>
              <div className="w-56 border-b border-gray-400 mb-1"></div>
              <p className="font-bold text-gray-900">
                {patient.medicoAtendio || "Médico Tratante"}
              </p>
              <p className="text-gray-500">
                Especialidad: {patient.especialidad}
              </p>
            </div>
            <div className="text-right text-[11px] text-gray-400">
              Jornada Humanitaria • El Cairo, Valle del Cauca
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
