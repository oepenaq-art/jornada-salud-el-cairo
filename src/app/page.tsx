"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Doctor,
  OfflineAudioRecord,
  Patient,
} from "../types/medical";
import {
  ESPECIALIDADES_JORNADA,
  MEDICOS_INICIALES,
  PACIENTES_INICIALES,
} from "../data/initialData";
import {
  getOfflineAudioQueue,
  loadDoctors,
  loadPatients,
  removeOfflineAudio,
  saveAllDoctors,
  saveAllPatients,
  saveOfflineAudio,
  savePatient,
} from "../lib/storage";
import {
  subscribeToCloudPatients,
  syncBatchPatientsToCloud,
  syncPatientToCloud,
} from "../lib/firebaseSync";
import { exportJornadaToExcel } from "../lib/excelUtils";
import { cleanMojibake, getCanonicalSpecialty, normalizeText } from "../lib/normalize";
import PatientAttentionModal from "../components/PatientAttentionModal";
import PrintableReferralModal from "../components/PrintableReferralModal";
import CoordinatorModal from "../components/CoordinatorModal";
import {
  Search,
  Mic,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  Download,
  FileText,
  UserCheck,
  MapPin,
  RefreshCw,
  Stethoscope,
  CalendarClock,
  FlaskConical,
  Ambulance,
  ChevronRight,
  ListFilter,
  Users,
} from "lucide-react";

export default function HomePage() {
  const [patients, setPatients] = useState<Patient[]>(PACIENTES_INICIALES);
  const [doctors, setDoctors] = useState<Doctor[]>(MEDICOS_INICIALES);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("Todas");
  const [activeDoctor, setActiveDoctor] = useState<string>(
    MEDICOS_INICIALES[0].nombre
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusTab, setStatusTab] = useState<
    "pendientes" | "requieren" | "todos"
  >("pendientes");

  // Modals
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [printPatient, setPrintPatient] = useState<Patient | null>(null);
  const [showCoordinator, setShowCoordinator] = useState<boolean>(false);

  // Network & Offline Sync states
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAudioRecord[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [hasServerApiKey, setHasServerApiKey] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>("");

  // Cargar datos iniciales de IndexedDB y verificar estado del servidor
  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const savedKey = localStorage.getItem("tejas_gemini_api_key") || "";
    const savedDoc = localStorage.getItem("tejas_active_doctor") || "";
    const savedEsp = localStorage.getItem("tejas_active_specialty") || "";
    if (savedKey) setCustomApiKey(savedKey);
    if (savedDoc) setActiveDoctor(savedDoc);
    if (savedEsp) setSelectedSpecialty(savedEsp);

    // Cargar desde IndexedDB
    loadPatients().then((loaded) => {
      if (loaded && loaded.length > 0) {
        setPatients(loaded);
      }
    });
    loadDoctors().then((loadedDocs) => {
      if (loadedDocs && loadedDocs.length > 0) {
        setDoctors(loadedDocs);
        if (!savedDoc) {
          setActiveDoctor(loadedDocs[0].nombre);
        }
      }
    });
    getOfflineAudioQueue().then((q) => setOfflineQueue(q));

    // Consultar si el servidor en Vercel ya tiene GEMINI_API_KEY
    fetch("/api/analyze-audio")
      .then((r) => r.json())
      .then((d) => {
        if (d?.hasServerKey) setHasServerApiKey(true);
      })
      .catch(() => {});

    // Suscribirse a Firebase Firestore
    const unsub = subscribeToCloudPatients((cloudPatients) => {
      if (cloudPatients && cloudPatients.length > 0) {
        setPatients(cloudPatients);
        saveAllPatients(cloudPatients, false);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (unsub) unsub();
    };
  }, []);

  // Lista dinámica de especialidades disponibles con tildes canónicas unificadas
  const allSpecialties = useMemo(() => {
    const map = new Map<string, string>();
    ESPECIALIDADES_JORNADA.forEach((e) => {
      map.set(normalizeText(e), getCanonicalSpecialty(e));
    });
    patients.forEach((p) => {
      if (p.especialidad) {
        p.especialidad.split(",").forEach((item) => {
          const t = item.trim();
          if (t) {
            map.set(normalizeText(t), getCanonicalSpecialty(t));
          }
        });
      }
    });
    doctors.forEach((d) => {
      if (d.especialidad) {
        map.set(normalizeText(d.especialidad), getCanonicalSpecialty(d.especialidad));
      }
    });
    return Array.from(map.values());
  }, [patients, doctors]);

  // Contadores para las pestañas de la especialidad seleccionada
  const specialtyCounts = useMemo(() => {
    const normSelected = normalizeText(selectedSpecialty);
    const base =
      selectedSpecialty === "Todas"
        ? patients
        : patients.filter((p) =>
            normalizeText(p.especialidad).includes(normSelected)
          );
    return {
      total: base.length,
      pendientes: base.filter((p) => p.estado !== "atendido").length,
      requieren: base.filter(
        (p) =>
          p.requiereSeguimiento || p.requiereExamenes || p.requiereRemision
      ).length,
      atendidos: base.filter((p) => p.estado === "atendido").length,
    };
  }, [patients, selectedSpecialty]);

  // Filtrar pacientes según especialidad, pestaña y búsqueda (soporta especialidades compuestas y búsqueda global por documento)
  const { filteredPatients, isShowingGlobalFallback, totalGlobalMatches } = useMemo(() => {
    const normSelected = normalizeText(selectedSpecialty);
    const normQuery = normalizeText(searchQuery);

    const matchesQuery = (p: Patient) => {
      if (!normQuery) return true;
      const matchName = normalizeText(p.nombre).includes(normQuery);
      const matchDoc = normalizeText(p.documento).includes(normQuery);
      const matchTel = normalizeText(p.telefono).includes(normQuery);
      const matchEsp = normalizeText(p.especialidad).includes(normQuery);
      return matchName || matchDoc || matchTel || matchEsp;
    };

    const matchesStatus = (p: Patient) => {
      if (statusTab === "pendientes" && p.estado === "atendido") return false;
      if (
        statusTab === "requieren" &&
        !p.requiereSeguimiento &&
        !p.requiereExamenes &&
        !p.requiereRemision
      ) {
        return false;
      }
      return true;
    };

    // 1. Filtrar dentro de la especialidad seleccionada
    let list = patients.filter((p) => {
      if (selectedSpecialty !== "Todas") {
        if (!normalizeText(p.especialidad).includes(normSelected)) {
          return false;
        }
      }
      return matchesStatus(p) && matchesQuery(p);
    });

    let isFallback = false;
    let globalCount = 0;

    // 2. Si no hubo resultados con la búsqueda (por ejemplo por número de cédula),
    // buscar automáticamente en la lista COMPLETA de todos los pacientes
    if (list.length === 0 && normQuery && selectedSpecialty !== "Todas") {
      const globalMatches = patients.filter(
        (p) => matchesStatus(p) && matchesQuery(p)
      );
      if (globalMatches.length > 0) {
        list = globalMatches;
        isFallback = true;
        globalCount = globalMatches.length;
      }
    }

    return {
      filteredPatients: list,
      isShowingGlobalFallback: isFallback,
      totalGlobalMatches: globalCount,
    };
  }, [patients, selectedSpecialty, statusTab, searchQuery]);

  const handleSelectSpecialty = (esp: string) => {
    setSelectedSpecialty(esp);
    localStorage.setItem("tejas_active_specialty", esp);
    if (esp !== "Todas") {
      const normEsp = normalizeText(esp);
      const matchingDoc = doctors.find(
        (d) => normalizeText(d.especialidad).includes(normEsp)
      );
      if (matchingDoc) {
        setActiveDoctor(matchingDoc.nombre);
        localStorage.setItem("tejas_active_doctor", matchingDoc.nombre);
      }
    }
  };

  const handleSelectDoctor = (docName: string) => {
    setActiveDoctor(docName);
    localStorage.setItem("tejas_active_doctor", docName);
  };

  const handleSavePatient = async (updated: Patient) => {
    const newList = patients.map((p) => (p.id === updated.id ? updated : p));
    setPatients(newList);
    await savePatient(updated);
    await syncPatientToCloud(updated);
  };

  const handleQueueOfflineAudio = async (
    record: OfflineAudioRecord,
    updatedPatient: Patient
  ) => {
    await saveOfflineAudio(record);
    const updatedQueue = await getOfflineAudioQueue();
    setOfflineQueue(updatedQueue);
    await handleSavePatient(updatedPatient);
  };

  const handleSyncOfflineAudios = async () => {
    if (offlineQueue.length === 0 || isSyncingQueue) return;
    setIsSyncingQueue(true);

    for (const item of offlineQueue) {
      const targetPatient = patients.find((p) => p.id === item.patientId);
      if (!targetPatient) {
        await removeOfflineAudio(item.patientId);
        continue;
      }

      try {
        const res = await fetch("/api/analyze-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: item.audioBase64,
            mimeType: item.mimeType,
            customApiKey,
            patientInfo: {
              nombre: targetPatient.nombre,
              edad: targetPatient.edad,
              sexo: targetPatient.sexo,
              especialidad: targetPatient.especialidad,
              motivoInicial: targetPatient.motivoInicial,
            },
            triageFlags: item.triageFlags,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.structured) {
            const updated: Patient = {
              ...targetPatient,
              estado: "atendido",
              tieneAudioPendiente: false,
              analisisEstructurado: data.structured,
            };
            await handleSavePatient(updated);
            await removeOfflineAudio(item.patientId);
          }
        }
      } catch (err) {
        console.error("Error sincronizando audio en cola:", err);
      }
    }

    const remaining = await getOfflineAudioQueue();
    setOfflineQueue(remaining);
    setIsSyncingQueue(false);
  };

  const handleImportData = async (
    newPatients: Patient[],
    newDoctors: Doctor[],
    replaceAll: boolean
  ) => {
    if (newPatients.length > 0) {
      const mergedPatients = replaceAll
        ? newPatients
        : [...patients, ...newPatients];
      setPatients(mergedPatients);
      await saveAllPatients(mergedPatients, replaceAll);
      await syncBatchPatientsToCloud(mergedPatients);
    }

    if (newDoctors.length > 0) {
      const mergedDoctors = replaceAll
        ? newDoctors
        : [...doctors, ...newDoctors];
      setDoctors(mergedDoctors);
      await saveAllDoctors(mergedDoctors, replaceAll);
    }
  };

  const handleAddSinglePatient = async (newP: Patient) => {
    const next = [newP, ...patients];
    setPatients(next);
    await savePatient(newP);
    await syncPatientToCloud(newP);
  };

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("tejas_gemini_api_key", key);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 pb-20">
      {/* Banner Decorativo Superior inspirado en el Calado de El Cairo */}
      <div
        className="h-2.5 w-full bg-repeat-x bg-center"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #d25427 0%, #FACC15 25%, #38BDF8 50%, #356530 75%, #d25427 100%)",
        }}
      />

      {/* Cabecera Principal con Imagen de Fondo de El Cairo (Chiva y Casas Coloniales) */}
      <header className="relative bg-pueblo-900 text-white overflow-hidden shadow-lg">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('/images/el-cairo-chiva.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-pueblo-900/80 via-pueblo-900/75 to-pueblo-900/95" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-3.5 pb-4 space-y-3">
          {/* Fila superior: Logo Fundación + Botones de Estado y Coordinación */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-2xl p-1.5 shadow-md shrink-0">
                <img
                  src="/images/logo-tejas.png"
                  alt="Logo Tejas para mi Pueblo"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 bg-teja-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                  <MapPin className="w-3 h-3" />
                  El Cairo, Valle del Cauca
                </div>
                <h1 className="text-base sm:text-xl font-extrabold tracking-tight leading-tight mt-1">
                  Jornada Médica • Tejas para mi Pueblo
                </h1>
                <p className="text-[11px] text-pueblo-100 font-medium">
                  Registro Clínico Móvil y Estructuración por Voz con IA
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    isOnline
                      ? "bg-green-500/20 text-green-200 border border-green-400/40"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3" /> En línea
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3" /> Sin señal (Modo Local)
                    </>
                  )}
                </span>

                <button
                  onClick={() => setShowCoordinator(true)}
                  className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-xl border border-white/20 transition flex items-center gap-1 text-xs font-bold"
                  title="Panel de Coordinación, Carga de Excel y Configuración"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Coordinación</span>
                </button>
              </div>

              <button
                onClick={() => exportJornadaToExcel(patients)}
                className="text-[11px] font-bold text-amber-200 hover:text-white flex items-center gap-1 underline"
              >
                <Download className="w-3 h-3" />
                Exportar Excel ({patients.length})
              </button>
            </div>
          </div>

          {/* Selector del Médico Activo en el celular */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <Stethoscope className="w-4 h-4 text-teja-400 shrink-0" />
              <span className="text-pueblo-100 font-semibold shrink-0">
                Médico en turno:
              </span>
              <select
                value={activeDoctor}
                onChange={(e) => handleSelectDoctor(e.target.value)}
                className="bg-white text-gray-900 font-bold text-xs rounded-xl px-2.5 py-1.5 flex-1 focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.nombre}>
                    {cleanMojibake(d.nombre)} ({getCanonicalSpecialty(d.especialidad)})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Alerta de Cola de Sincronización Offline (si hay audios grabados sin señal) */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2.5 shadow-md">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                {offlineQueue.length} audio(s) guardados en el teléfono
                pendientes de procesar con IA.
              </span>
            </div>
            <button
              disabled={!isOnline || isSyncingQueue}
              onClick={handleSyncOfflineAudios}
              className="bg-white text-amber-900 hover:bg-amber-50 disabled:opacity-50 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 shrink-0 transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncingQueue ? "animate-spin" : ""
                }`}
              />
              {isSyncingQueue ? "Sincronizando..." : "Sincronizar Ahora"}
            </button>
          </div>
        </div>
      )}

      {/* Contenedor Principal Móvil */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3.5 pt-3 space-y-3.5">
        {/* 1. Píldoras Táctiles de Especialidades */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1">
              <ListFilter className="w-3.5 h-3.5 text-pueblo-700" />
              1. Filtrar por Especialidad
            </span>
            <button
              onClick={() => handleSelectSpecialty("Todas")}
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full transition ${
                selectedSpecialty === "Todas"
                  ? "bg-teja-100 text-teja-800"
                  : "text-pueblo-700 hover:underline"
              }`}
            >
              Ver lista completa ({patients.length})
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            <button
              onClick={() => handleSelectSpecialty("Todas")}
              className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition shadow-sm ${
                selectedSpecialty === "Todas"
                  ? "bg-teja-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200"
              }`}
            >
              Todas ({patients.length})
            </button>

            {allSpecialties.map((esp) => {
              const normEsp = normalizeText(esp);
              const count = patients.filter((p) =>
                normalizeText(p.especialidad).includes(normEsp)
              ).length;
              const isSelected =
                normalizeText(selectedSpecialty) === normEsp;

              return (
                <button
                  key={esp}
                  onClick={() => handleSelectSpecialty(esp)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition shadow-sm ${
                    isSelected
                      ? "bg-pueblo-700 text-white"
                      : "bg-white text-gray-700 border border-gray-200"
                  }`}
                >
                  {esp} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selector Desplegable Rápido de la Lista Completa de Pacientes */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <label
              htmlFor="selector-paciente-completo"
              className="text-[11px] font-extrabold text-amber-950 flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-amber-800" />
              <span>Lista Completa ({patients.length} pacientes) - Selección Rápida:</span>
            </label>
            {selectedSpecialty !== "Todas" && (
              <button
                type="button"
                onClick={() => handleSelectSpecialty("Todas")}
                className="text-[10px] font-bold text-amber-900 underline hover:text-amber-950"
              >
                Quitar filtro de especialidad
              </button>
            )}
          </div>
          <select
            id="selector-paciente-completo"
            value=""
            onChange={(e) => {
              const target = patients.find((p) => p.id === e.target.value);
              if (target) {
                setSelectedPatient(target);
              }
            }}
            className="w-full bg-white text-gray-900 border border-amber-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
          >
            <option value="">
              -- Busca y selecciona cualquier paciente por documento o nombre ({patients.length}) --
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.tipoDocumento || "CC"} {p.documento || "S/D"} • {cleanMojibake(p.nombre)} • {p.edad} años • {getCanonicalSpecialty(p.especialidad)}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Buscador Rápido y Pestañas de Estado */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, número de documento o teléfono..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pueblo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Aviso inteligente de búsqueda global si no coincidió en la especialidad activa */}
          {isShowingGlobalFallback && (
            <div className="bg-blue-50 border border-blue-200 text-blue-900 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2">
              <span>
                No se encontró en <strong>{selectedSpecialty}</strong>, pero se hallaron{" "}
                <strong>{totalGlobalMatches} paciente(s)</strong> en la lista general:
              </span>
              <button
                onClick={() => setSelectedSpecialty("Todas")}
                className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shrink-0"
              >
                Ver todos
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-extrabold">
            <button
              onClick={() => setStatusTab("pendientes")}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                statusTab === "pendientes"
                  ? "bg-white text-teja-700 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pendientes ({specialtyCounts.pendientes})
            </button>

            <button
              onClick={() => setStatusTab("requieren")}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                statusTab === "requieren"
                  ? "bg-white text-red-600 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              <Ambulance className="w-3.5 h-3.5" />
              Remitidos ({specialtyCounts.requieren})
            </button>

            <button
              onClick={() => setStatusTab("todos")}
              className={`py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                statusTab === "todos"
                  ? "bg-white text-pueblo-700 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Todos ({specialtyCounts.total})
            </button>
          </div>
        </div>

        {/* 4. Lista de Tarjetas de Pacientes */}
        <div className="space-y-2.5">
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 space-y-3">
              <p className="text-sm font-bold text-gray-700">
                No hay pacientes con ese criterio en &ldquo;{selectedSpecialty}&rdquo;
              </p>
              <p className="text-xs text-gray-500">
                Si el paciente fue registrado para otra especialidad, búscalo en la lista completa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecialty("Todas");
                  setSearchQuery("");
                }}
                className="bg-pueblo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-pueblo-800 transition"
              >
                Mostrar Lista Completa ({patients.length} pacientes)
              </button>
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const isAttended = patient.estado === "atendido";
              const isPendingIA = patient.estado === "pendiente_ia";

              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition cursor-pointer active:scale-[0.99] ${
                    isAttended
                      ? "border-pueblo-200 hover:border-pueblo-400"
                      : isPendingIA
                      ? "border-amber-400 bg-amber-50/20"
                      : "border-transparent hover:border-teja-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Columnas requeridas: Nombre, Tipo de documento, Número de documento, Edad en años, Teléfono y Especialidad */}
                    <div className="space-y-1">
                      {/* Especialidad + Tipo y Número de Documento */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-pueblo-100 text-pueblo-900 border border-pueblo-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg">
                          {getCanonicalSpecialty(patient.especialidad)}
                        </span>
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {patient.tipoDocumento || "CC"} {patient.documento || "Sin documento"}
                        </span>
                      </div>

                      {/* Nombre completo */}
                      <h3 className="text-base font-extrabold text-gray-900 pt-0.5 leading-snug">
                        {cleanMojibake(patient.nombre)}
                      </h3>

                      {/* Edad en años + Teléfono */}
                      <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap pt-0.5">
                        <span className="font-bold text-gray-800">
                          {patient.edad} años
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="font-medium text-gray-600 flex items-center gap-1">
                          📞 {patient.telefono && patient.telefono !== "0" && patient.telefono.trim() !== "" ? patient.telefono : "Sin teléfono"}
                        </span>
                      </div>
                    </div>

                    {/* Estado del paciente */}
                    <div className="shrink-0">
                      {isAttended ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          Atendido
                        </span>
                      ) : isPendingIA ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-1 rounded-full">
                          <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                          Audio en Cola
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-teja-600 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-sm">
                          <Mic className="w-3.5 h-3.5" />
                          Atender
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Etiquetas de Seguimiento, Exámenes o Remisión si ya fueron marcadas */}
                  {(patient.requiereSeguimiento ||
                    patient.requiereExamenes ||
                    patient.requiereRemision) && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {patient.requiereSeguimiento && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <CalendarClock className="w-3 h-3" />
                            Seguimiento
                          </span>
                        )}
                        {patient.requiereExamenes && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <FlaskConical className="w-3 h-3" />
                            Exámenes
                          </span>
                        )}
                        {patient.requiereRemision && (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-900 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <Ambulance className="w-3 h-3" />
                            Remisión
                          </span>
                        )}
                      </div>

                      {isAttended && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrintPatient(patient);
                          }}
                          className="text-xs font-extrabold text-teja-600 hover:text-teja-800 flex items-center gap-1 bg-teja-50 px-2.5 py-1 rounded-lg"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver Orden / WhatsApp
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {patient.analisisEstructurado?.resumenEjecutivo && (
                    <p className="mt-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
                      <strong className="text-pueblo-800">Análisis IA: </strong>
                      {patient.analisisEstructurado.resumenEjecutivo}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Tarjeta cultural de El Cairo al pie de la lista */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 mt-6">
          <img
            src="/images/fachadas-el-cairo.png"
            alt="Arquitectura tradicional de El Cairo, Valle del Cauca"
            className="w-full h-24 sm:h-32 object-cover"
          />
          <div className="p-3 flex items-center justify-between text-xs text-gray-600 bg-gradient-to-r from-pueblo-50 via-white to-teja-50">
            <div className="flex items-center gap-2.5">
              <img
                src="/images/calado-el-cairo.png"
                alt="Calado tradicional"
                className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
              />
              <div>
                <p className="font-extrabold text-pueblo-800">
                  Jornada Humanitaria en El Cairo, Valle del Cauca
                </p>
                <p className="text-[11px] text-gray-500">
                  Fundación &ldquo;Tejas para mi Pueblo&rdquo; • Patrimonio del Paisaje Cultural Cafetero
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Atención Médica y Dictado por Voz */}
      {selectedPatient && (
        <PatientAttentionModal
          patient={selectedPatient}
          activeDoctor={activeDoctor}
          isOnline={isOnline}
          customApiKey={customApiKey}
          onSavePatient={handleSavePatient}
          onQueueOfflineAudio={handleQueueOfflineAudio}
          onOpenPrintModal={(p) => {
            setSelectedPatient(null);
            setPrintPatient(p);
          }}
          onClose={() => setSelectedPatient(null)}
        />
      )}

      {/* Modal de Impresión / PDF / WhatsApp de la Orden o Remisión */}
      {printPatient && (
        <PrintableReferralModal
          patient={printPatient}
          onClose={() => setPrintPatient(null)}
        />
      )}

      {/* Modal de Coordinación (Carga Excel, Nuevo Paciente, API Key) */}
      {showCoordinator && (
        <CoordinatorModal
          patients={patients}
          doctors={doctors}
          specialties={allSpecialties}
          hasServerApiKey={hasServerApiKey}
          customApiKey={customApiKey}
          onSaveApiKey={handleSaveApiKey}
          onImportData={handleImportData}
          onAddSinglePatient={handleAddSinglePatient}
          onClose={() => setShowCoordinator(false)}
        />
      )}
    </div>
  );
}
