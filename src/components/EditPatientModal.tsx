"use client";

import React, { useState } from "react";
import { Patient } from "../types/medical";
import { ESPECIALIDADES_JORNADA } from "../data/initialData";
import { cleanMojibake } from "../lib/normalize";
import {
  X,
  Save,
  User,
  CreditCard,
  Calendar,
  Phone,
  Stethoscope,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface Props {
  patient: Patient;
  onSave: (updated: Patient) => Promise<void>;
  onClose: () => void;
}

export default function EditPatientModal({ patient, onSave, onClose }: Props) {
  const [nombre, setNombre] = useState(cleanMojibake(patient.nombre));
  const [tipoDocumento, setTipoDocumento] = useState<string>(
    patient.tipoDocumento || "CC"
  );
  const [documento, setDocumento] = useState(patient.documento || "");
  const [edad, setEdad] = useState<number | string>(patient.edad ?? "");
  const [telefono, setTelefono] = useState(patient.telefono || "");
  const [especialidad, setEspecialidad] = useState(
    cleanMojibake(patient.especialidad) || "Medicina General"
  );
  const [veredaBarrio, setVeredaBarrio] = useState(
    cleanMojibake(patient.veredaBarrio || "")
  );

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSaving(true);
    const updated: Patient = {
      ...patient,
      nombre: nombre.trim(),
      tipoDocumento,
      documento: documento.trim(),
      edad: Number(edad) || 0,
      telefono: telefono.trim(),
      especialidad: especialidad.trim(),
      veredaBarrio: veredaBarrio.trim(),
    };

    try {
      await onSave(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error("Error guardando cambios del paciente:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-gray-200">
        {/* Cabecera del modal */}
        <div className="bg-gradient-to-r from-pueblo-900 via-pueblo-800 to-teja-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2 rounded-xl">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">
                Editar Datos del Paciente
              </h2>
              <p className="text-[11px] text-pueblo-100">
                Corrige errores de nombres, cédula, edad, teléfono o especialidad
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Nombre completo */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
              <User className="w-3.5 h-3.5 text-pueblo-700" />
              Nombre completo:
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Elena Pérez Gómez"
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Tipo y Número de Documento */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-1">
              <label className="font-extrabold text-gray-800 block mb-1 text-xs">
                Tipo Doc:
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-2.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
              >
                <option value="CC">CC (Cédula)</option>
                <option value="TI">TI (Tarjeta)</option>
                <option value="RC">RC (Registro)</option>
                <option value="CE">CE (Extranjería)</option>
                <option value="PPT">PPT (Permiso Protección)</option>
                <option value="PT">PT (Permiso Temporal)</option>
                <option value="NV">NV (Nacido Vivo)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-pueblo-700" />
                Número de documento:
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej. 1112796556"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Edad y Teléfono */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-pueblo-700" />
                Edad (en años):
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                placeholder="Ej. 45"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <Phone className="w-3.5 h-3.5 text-pueblo-700" />
                Teléfono / Celular:
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 3123456789"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Especialidad / Servicios solicitados */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center justify-between mb-1 text-xs">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teja-600" />
                Especialidad / Servicios Solicitados:
              </span>
              <span className="text-[10px] text-gray-500 font-normal">
                (Puedes escribir varias separadas por coma)
              </span>
            </label>
            <div className="space-y-1.5">
              <input
                type="text"
                required
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                placeholder="Ej. Pediatría, Odontología"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
              />
              <div className="flex flex-wrap gap-1">
                {ESPECIALIDADES_JORNADA.map((esp) => (
                  <button
                    key={esp}
                    type="button"
                    onClick={() => {
                      if (!especialidad.includes(esp)) {
                        setEspecialidad(
                          especialidad ? `${especialidad}, ${esp}` : esp
                        );
                      }
                    }}
                    className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md transition"
                  >
                    + {esp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vereda o Barrio */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-pueblo-700" />
              Vereda o Barrio (opcional):
            </label>
            <input
              type="text"
              value={veredaBarrio}
              onChange={(e) => setVeredaBarrio(e.target.value)}
              placeholder="Ej. Cabecera municipal El Cairo, Vereda Bellavista, Albán..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pueblo-500 bg-gray-50 focus:bg-white"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl shadow flex items-center gap-1.5 transition ${
                savedSuccess
                  ? "bg-green-600"
                  : "bg-teja-600 hover:bg-teja-700 active:scale-95"
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> ¡Guardado!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
