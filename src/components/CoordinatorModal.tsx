"use client";

import React, { useState } from "react";
import { Doctor, Patient } from "../types/medical";
import {
  downloadTemplateExcel,
  exportJornadaToExcel,
  parseExcelFile,
} from "../lib/excelUtils";
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  KeyRound,
  UserPlus,
  Cloud,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Props {
  patients: Patient[];
  doctors: Doctor[];
  specialties: string[];
  hasServerApiKey: boolean;
  customApiKey: string;
  onSaveApiKey: (key: string) => void;
  onImportData: (
    newPatients: Patient[],
    newDoctors: Doctor[],
    replaceAll: boolean
  ) => Promise<void>;
  onAddSinglePatient: (patient: Patient) => Promise<void>;
  onClose: () => void;
}

export default function CoordinatorModal({
  patients,
  specialties,
  hasServerApiKey,
  customApiKey,
  onSaveApiKey,
  onImportData,
  onAddSinglePatient,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<"excel" | "nuevo" | "config">(
    "excel"
  );
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState(customApiKey);
  const [fbApiKey, setFbApiKey] = useState(() =>
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tejas_firebase_config") || "{}")
          .apiKey || ""
      : ""
  );
  const [fbProjectId, setFbProjectId] = useState(() =>
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("tejas_firebase_config") || "{}")
          .projectId || ""
      : ""
  );

  // Estado para agregar paciente rápido en sitio
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTipoDoc, setNuevoTipoDoc] =
    useState<Patient["tipoDocumento"]>("CC");
  const [nuevoDoc, setNuevoDoc] = useState("");
  const [nuevaEdad, setNuevaEdad] = useState("45");
  const [nuevoSexo, setNuevoSexo] = useState<Patient["sexo"]>("F");
  const [nuevaVereda, setNuevaVereda] = useState("Cabecera Municipal");
  const [nuevoTel, setNuevoTel] = useState("");
  const [nuevaEsp, setNuevaEsp] = useState(
    specialties[0] || "Medicina General"
  );
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImportMsg("Procesando archivo...");
      const { patients: parsedPatients, doctors: parsedDoctors } =
        await parseExcelFile(file);

      if (parsedPatients.length === 0 && parsedDoctors.length === 0) {
        setImportMsg(
          "No se encontraron filas válidas. Verifica que la hoja tenga columnas 'Nombre', 'Documento', 'Especialidad'."
        );
        return;
      }

      await onImportData(parsedPatients, parsedDoctors, replaceExisting);
      setImportMsg(
        `¡Carga exitosa! Se importaron ${parsedPatients.length} pacientes y ${parsedDoctors.length} médicos.`
      );
    } catch (err) {
      console.error(err);
      setImportMsg("Error al leer el archivo Excel/CSV.");
    }
  };

  const handleCreateSinglePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    const newP: Patient = {
      id: `pac-manual-${Date.now()}`,
      tipoDocumento: nuevoTipoDoc,
      documento: nuevoDoc.trim() || "S/D",
      nombre: nuevoNombre.trim(),
      edad: Number(nuevaEdad) || 30,
      sexo: nuevoSexo,
      telefono: nuevoTel.trim(),
      veredaBarrio: nuevaVereda.trim(),
      especialidad: nuevaEsp,
      motivoInicial: nuevoMotivo.trim() || "Consulta en jornada",
      estado: "pendiente",
      requiereSeguimiento: false,
      requiereExamenes: false,
      requiereRemision: false,
    };

    await onAddSinglePatient(newP);
    setNuevoNombre("");
    setNuevoDoc("");
    setNuevoMotivo("");
    setImportMsg(`Paciente ${newP.nombre} agregado a ${newP.especialidad}.`);
  };

  const handleSaveConfig = () => {
    onSaveApiKey(apiKeyInput.trim());
    if (fbApiKey.trim() && fbProjectId.trim()) {
      localStorage.setItem(
        "tejas_firebase_config",
        JSON.stringify({
          apiKey: fbApiKey.trim(),
          projectId: fbProjectId.trim(),
        })
      );
    } else {
      localStorage.removeItem("tejas_firebase_config");
    }
    setImportMsg("Configuración guardada correctamente.");
  };

  const totalAtendidos = patients.filter((p) => p.estado === "atendido").length;
  const totalRemisiones = patients.filter((p) => p.requiereRemision).length;
  const totalExamenes = patients.filter((p) => p.requiereExamenes).length;
  const totalSeguimientos = patients.filter(
    (p) => p.requiereSeguimiento
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="bg-pueblo-700 text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">
              Panel de Coordinación • Tejas para mi Pueblo
            </h2>
            <p className="text-xs text-pueblo-100">
              Carga de pacientes, exportación Excel y ajustes de la jornada
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="grid grid-cols-3 bg-gray-100 p-1 gap-1 border-b border-gray-200 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab("excel");
              setImportMsg("");
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === "excel"
                ? "bg-white text-pueblo-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel / Reportes
          </button>
          <button
            onClick={() => {
              setActiveTab("nuevo");
              setImportMsg("");
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === "nuevo"
                ? "bg-white text-pueblo-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Paciente
          </button>
          <button
            onClick={() => {
              setActiveTab("config");
              setImportMsg("");
            }}
            className={`py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === "config"
                ? "bg-white text-pueblo-700 shadow-sm"
                : "text-gray-600"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            API / Nube
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {importMsg && (
            <div className="bg-pueblo-50 border border-pueblo-300 text-pueblo-800 px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pueblo-600 shrink-0" />
              <span>{importMsg}</span>
            </div>
          )}

          {activeTab === "excel" && (
            <div className="space-y-4">
              {/* Resumen estadístico */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                  <span className="text-lg font-extrabold text-gray-800 block">
                    {patients.length}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">
                    Total
                  </span>
                </div>
                <div className="bg-pueblo-50 border border-pueblo-200 rounded-xl p-2.5">
                  <span className="text-lg font-extrabold text-pueblo-700 block">
                    {totalAtendidos}
                  </span>
                  <span className="text-[10px] text-pueblo-700 uppercase font-semibold">
                    Atendidos
                  </span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
                  <span className="text-lg font-extrabold text-red-600 block">
                    {totalRemisiones}
                  </span>
                  <span className="text-[10px] text-red-700 uppercase font-semibold">
                    Remisiones
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5">
                  <span className="text-lg font-extrabold text-blue-600 block">
                    {totalExamenes + totalSeguimientos}
                  </span>
                  <span className="text-[10px] text-blue-700 uppercase font-semibold">
                    Exám/Seg
                  </span>
                </div>
              </div>

              {/* Botón Principal de Exportar Consolidado */}
              <div className="bg-teja-50 border border-teja-200 rounded-2xl p-4 space-y-2.5">
                <h3 className="font-bold text-teja-900 text-sm">
                  1. Descargar Base de Datos Consolidada (Excel)
                </h3>
                <p className="text-xs text-gray-600">
                  Genera un archivo Excel completo con todos los pacientes, qué
                  requieren (seguimiento, exámenes o remisión) y el análisis
                  médico estructurado por IA.
                </p>
                <button
                  onClick={() => exportJornadaToExcel(patients)}
                  className="w-full py-3 bg-teja-600 hover:bg-teja-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  Descargar Consolidado en Excel (.xlsx)
                </button>
              </div>

              {/* Subir lista desde Excel */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">
                    2. Cargar Pacientes y Médicos desde Excel
                  </h3>
                  <button
                    onClick={downloadTemplateExcel}
                    className="text-xs font-semibold text-pueblo-700 underline hover:text-pueblo-800"
                  >
                    Descargar plantilla
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Sube un archivo <code>.xlsx</code> o <code>.csv</code> con los
                  pacientes clasificados por especialidad.
                </p>

                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded text-teja-600"
                  />
                  Reemplazar la lista actual por completo (en vez de agregar)
                </label>

                <label className="w-full py-3 border-2 border-dashed border-pueblo-400 bg-white hover:bg-pueblo-50 text-pueblo-700 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>Seleccionar Archivo Excel (.xlsx / .csv)</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === "nuevo" && (
            <form onSubmit={handleCreateSinglePatient} className="space-y-3">
              <p className="text-xs text-gray-600">
                Inscribe rápidamente a un paciente adicional que llegue durante
                la jornada en El Cairo:
              </p>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej. María del Carmen Valencia"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Tipo Doc
                  </label>
                  <select
                    value={nuevoTipoDoc}
                    onChange={(e) =>
                      setNuevoTipoDoc(
                        e.target.value as Patient["tipoDocumento"]
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-2.5 py-2.5 text-sm bg-white"
                  >
                    <option value="CC">CC</option>
                    <option value="TI">TI</option>
                    <option value="RC">RC</option>
                    <option value="CE">CE</option>
                    <option value="PT">PT</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Número de Documento
                  </label>
                  <input
                    type="text"
                    value={nuevoDoc}
                    onChange={(e) => setNuevoDoc(e.target.value)}
                    placeholder="Ej. 29.415.000"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Edad
                  </label>
                  <input
                    type="number"
                    value={nuevaEdad}
                    onChange={(e) => setNuevaEdad(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Sexo
                  </label>
                  <select
                    value={nuevoSexo}
                    onChange={(e) =>
                      setNuevoSexo(e.target.value as Patient["sexo"])
                    }
                    className="w-full border border-gray-300 rounded-xl px-2.5 py-2.5 text-sm bg-white"
                  >
                    <option value="F">Femenino</option>
                    <option value="M">Masculino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={nuevoTel}
                    onChange={(e) => setNuevoTel(e.target.value)}
                    placeholder="312..."
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Especialidad Asignada *
                  </label>
                  <select
                    value={nuevaEsp}
                    onChange={(e) => setNuevaEsp(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-2.5 py-2.5 text-sm bg-white font-semibold text-pueblo-800"
                  >
                    {specialties.map((esp) => (
                      <option key={esp} value={esp}>
                        {esp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Vereda / Barrio
                  </label>
                  <input
                    type="text"
                    value={nuevaVereda}
                    onChange={(e) => setNuevaVereda(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Motivo Inicial de Consulta
                </label>
                <input
                  type="text"
                  value={nuevoMotivo}
                  onChange={(e) => setNuevoMotivo(e.target.value)}
                  placeholder="Ej. Dolor torácico, control de hipertensión..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-pueblo-600 hover:bg-pueblo-700 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition"
              >
                <UserPlus className="w-4 h-4" />
                Agregar Paciente a la Lista
              </button>
            </form>
          )}

          {activeTab === "config" && (
            <div className="space-y-4">
              {/* Estado de la API Key de Vercel */}
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                  hasServerApiKey
                    ? "bg-green-50 border-green-300 text-green-900"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                }`}
              >
                {hasServerApiKey ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {hasServerApiKey
                      ? "API Key Centralizada Activa en Servidor (Vercel)"
                      : "Variable GEMINI_API_KEY no detectada en el servidor"}
                  </p>
                  <p className="mt-0.5">
                    {hasServerApiKey
                      ? "Todos los médicos pueden grabar y estructurar notas sin ingresar ninguna clave."
                      : "En Vercel agrega la variable de entorno GEMINI_API_KEY para que ningún médico tenga que ingresarla, o colócala aquí abajo para este dispositivo."}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  API Key de Google Gemini (Respaldo Local Opcional)
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono"
                />
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2.5">
                <div className="flex items-center gap-1.5 text-pueblo-800 font-bold text-xs">
                  <Cloud className="w-4 h-4" />
                  <span>
                    Sincronización en Nube con Firebase Firestore (Opcional)
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Si configuras las variables{" "}
                  <code>NEXT_PUBLIC_FIREBASE_API_KEY</code> y{" "}
                  <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code> en Vercel, todos
                  los teléfonos se sincronizarán en vivo automáticamente.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    placeholder="Project ID (ej. tejas-salud)"
                    className="border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                  <input
                    type="password"
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    placeholder="Firebase Web API Key"
                    className="border border-gray-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveConfig}
                className="w-full py-3 bg-teja-600 hover:bg-teja-700 text-white font-bold rounded-xl shadow transition"
              >
                Guardar Ajustes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
