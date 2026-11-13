"use client";

import React, { useState } from "react";
import { Patient } from "../types/medical";
import { ESPECIALIDADES_JORNADA } from "../data/initialData";
import { cleanMojibake, getCanonicalSpecialty } from "../lib/normalize";
import {
  X,
  UserPlus,
  User,
  CreditCard,
  Calendar,
  Phone,
  Stethoscope,
  MapPin,
  Mic,
  CheckCircle2,
  FileText,
} from "lucide-react";

interface Props {
  specialties: string[];
  defaultSpecialty?: string;
  initialQuery?: string;
  onAdd: (newPatient: Patient) => Promise<void>;
  onAddAndAttend: (newPatient: Patient) => Promise<void>;
  onClose: () => void;
}

const VEREDAS_EL_CAIRO = [
  "Cabecera Municipal",
  "Bellavista",
  "Boquerón",
  "El Silencio",
  "La Argelia",
  "Las Amarillas",
  "Alto Bonito",
  "San José",
  "La Albania",
  "El Pacífico",
];

export default function NewPatientModal({
  specialties,
  defaultSpecialty,
  initialQuery = "",
  onAdd,
  onAddAndAttend,
  onClose,
}: Props) {
  // Deducir si el initialQuery parece un número de documento o un nombre
  const isQueryNumber = /^\d+$/.test(initialQuery.trim());

  const [nombre, setNombre] = useState(isQueryNumber ? "" : initialQuery.trim());
  const [tipoDocumento, setTipoDocumento] = useState<string>("CC");
  const [documento, setDocumento] = useState(isQueryNumber ? initialQuery.trim() : "");
  const [edad, setEdad] = useState<string>("35");
  const [sexo, setSexo] = useState<Patient["sexo"]>("F");
  const [telefono, setTelefono] = useState("");
  const [especialidad, setEspecialidad] = useState(
    defaultSpecialty && defaultSpecialty !== "Todas"
      ? getCanonicalSpecialty(defaultSpecialty)
      : specialties[0] || "Medicina General"
  );
  const [veredaBarrio, setVeredaBarrio] = useState("Cabecera Municipal");
  const [motivoInicial, setMotivoInicial] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(false);

  const buildPatientObject = (): Patient => {
    const cleanDoc = documento.trim() || "S/D";
    const cleanName = nombre.trim();
    const cleanId = `pac-manual-${Date.now()}`;

    return {
      id: cleanId,
      tipoDocumento: tipoDocumento as Patient["tipoDocumento"],
      documento: cleanDoc,
      nombre: cleanName,
      edad: Number(edad) || 0,
      sexo,
      telefono: telefono.trim() || "0",
      veredaBarrio: veredaBarrio.trim() || "Cabecera Municipal",
      especialidad: especialidad.trim(),
      motivoInicial: motivoInicial.trim() || "Consulta espontánea en jornada",
      estado: "pendiente",
      requiereSeguimiento: false,
      requiereExamenes: false,
      requiereRemision: false,
    };
  };

  const handleSaveOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setIsSaving(true);
    try {
      const newP = buildPatientObject();
      await onAdd(newP);
      setActionSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error("Error al agregar paciente:", err);
      setIsSaving(false);
    }
  };

  const handleSaveAndAttend = async () => {
    if (!nombre.trim()) return;

    setIsSaving(true);
    try {
      const newP = buildPatientObject();
      await onAddAndAttend(newP);
      onClose();
    } catch (err) {
      console.error("Error al agregar y atender paciente:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera del modal */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">
                Agregar Nuevo Paciente
              </h2>
              <p className="text-[11px] text-emerald-100">
                Registro en sitio para pacientes que no estaban en la lista inicial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSaveOnly} className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Nombre completo */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>Nombre y Apellidos completos:</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Elena Pérez Gómez"
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
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
                className="w-full border border-gray-300 rounded-xl px-2.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
              >
                <option value="CC">CC (Cédula)</option>
                <option value="TI">TI (Tarjeta)</option>
                <option value="RC">RC (Registro)</option>
                <option value="CE">CE (Extranjería)</option>
                <option value="PPT">PPT (Protección)</option>
                <option value="PT">PT (Permiso Temp)</option>
                <option value="NV">NV (Nacido Vivo)</option>
                <option value="S/D">S/D (Sin Doc)</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span>Número de documento:</span>
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej. 1112796556 o S/D"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
              />
            </div>
          </div>

          {/* Edad y Sexo */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Edad (años):</span>
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={edad}
                onChange={(e) => setEdad(e.target.value)}
                placeholder="Ej. 35"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
              />
            </div>

            <div>
              <label className="font-extrabold text-gray-800 block mb-1 text-xs">
                Sexo Biológico:
              </label>
              <div className="flex items-center gap-2 pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl flex-1 justify-center">
                  <input
                    type="radio"
                    name="sexo"
                    value="F"
                    checked={sexo === "F"}
                    onChange={() => setSexo("F")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Femenino</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl flex-1 justify-center">
                  <input
                    type="radio"
                    name="sexo"
                    value="M"
                    checked={sexo === "M"}
                    onChange={() => setSexo("M")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Masculino</span>
                </label>
              </div>
            </div>
          </div>

          {/* Teléfono y Vereda / Barrio */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                <span>Teléfono / Celular:</span>
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 3123456789"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
              />
            </div>

            <div>
              <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Vereda / Barrio:</span>
              </label>
              <input
                type="text"
                list="lista-veredas"
                value={veredaBarrio}
                onChange={(e) => setVeredaBarrio(e.target.value)}
                placeholder="Ej. Cabecera Municipal"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
              />
              <datalist id="lista-veredas">
                {VEREDAS_EL_CAIRO.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Especialidad a la que acude */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              <span>Especialidad / Servicio Médico:</span>
            </label>
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
            >
              {specialties
                .filter((s) => s !== "Todas")
                .map((esp) => (
                  <option key={esp} value={getCanonicalSpecialty(esp)}>
                    {getCanonicalSpecialty(esp)}
                  </option>
                ))}
            </select>
          </div>

          {/* Motivo inicial de consulta / Observaciones */}
          <div>
            <label className="font-extrabold text-gray-800 flex items-center gap-1.5 mb-1 text-xs">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Motivo de consulta / Observaciones iniciales:</span>
              <span className="text-[10px] text-gray-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={motivoInicial}
              onChange={(e) => setMotivoInicial(e.target.value)}
              placeholder="Ej. Cefalea frecuente, control de tensión, revisión piel..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white shadow-sm"
            />
          </div>

          {/* Mensaje de confirmación */}
          {actionSuccess && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl p-2.5 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>¡Paciente agregado exitosamente a la jornada!</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition active:scale-95 text-xs"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving || !nombre.trim()}
              className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-extrabold shadow-sm transition active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Guardar en Lista</span>
            </button>

            <button
              type="button"
              disabled={isSaving || !nombre.trim()}
              onClick={handleSaveAndAttend}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition active:scale-95 disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
            >
              <Mic className="w-4 h-4" />
              <span>Guardar y Atender Ahora</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
