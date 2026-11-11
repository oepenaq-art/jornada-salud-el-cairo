"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  OfflineAudioRecord,
  Patient,
  StructuredMedicalNote,
} from "../types/medical";
import { blobToBase64 } from "../lib/storage";
import { cleanMojibake, getCanonicalSpecialty } from "../lib/normalize";
import {
  ArrowLeft,
  Mic,
  Square,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  FileText,
  RefreshCw,
  Stethoscope,
  FlaskConical,
  Ambulance,
  CalendarClock,
  Volume2,
  Keyboard,
} from "lucide-react";

interface Props {
  patient: Patient;
  activeDoctor: string;
  isOnline: boolean;
  customApiKey: string;
  onSavePatient: (updated: Patient) => Promise<void>;
  onQueueOfflineAudio: (
    record: OfflineAudioRecord,
    updatedPatient: Patient
  ) => Promise<void>;
  onOpenPrintModal: (patient: Patient) => void;
  onClose: () => void;
}

const EMPTY_NOTE: StructuredMedicalNote = {
  enfermedadActual: "",
  antecedentes: "",
  examenFisico: "",
  impresionDiagnostica: "",
  planYJustificacion: "",
  resumenEjecutivo: "",
};

export default function PatientAttentionModal({
  patient,
  activeDoctor,
  isOnline,
  customApiKey,
  onSavePatient,
  onQueueOfflineAudio,
  onOpenPrintModal,
  onClose,
}: Props) {
  const [requiereSeguimiento, setRequiereSeguimiento] = useState(
    patient.requiereSeguimiento
  );
  const [requiereExamenes, setRequiereExamenes] = useState(
    patient.requiereExamenes
  );
  const [requiereRemision, setRequiereRemision] = useState(
    patient.requiereRemision
  );
  const [detalleDestino, setDetalleDestino] = useState(
    patient.detalleDestino || ""
  );

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/webm");

  // Manual / Demo dictation input
  const [showTextDictation, setShowTextDictation] = useState(false);
  const [rawDictationText, setRawDictationText] = useState(
    patient.transcripcionCruda || ""
  );

  // AI processing states
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  // Structured Note state
  const [note, setNote] = useState<StructuredMedicalNote>(
    patient.analisisEstructurado || EMPTY_NOTE
  );
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const rem = (secs % 60).toString().padStart(2, "0");
    return `${mins}:${rem}`;
  };

  const startRecording = async () => {
    setAiError(null);
    setAiSuccessMsg(null);

    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setAiError(
        "Tu navegador no soporta grabación de audio directa. Puedes escribir o usar el micrófono del teclado de tu celular en la casilla de abajo."
      );
      setShowTextDictation(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/aac",
        "audio/ogg",
        "",
      ];
      let selectedType = "";
      for (const t of preferredTypes) {
        if (!t) break;
        try {
          if (
            typeof MediaRecorder !== "undefined" &&
            typeof MediaRecorder.isTypeSupported === "function" &&
            MediaRecorder.isTypeSupported(t)
          ) {
            selectedType = t;
            break;
          }
        } catch {
          // ignore
        }
      }

      const recorder = selectedType
        ? new MediaRecorder(stream, { mimeType: selectedType })
        : new MediaRecorder(stream);

      setAudioMimeType(recorder.mimeType || "audio/webm");
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      try {
        recorder.start(500);
      } catch {
        recorder.start();
      }
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accediendo al micrófono:", err);
      setAiError(
        "No se pudo acceder al micrófono. Verifica los permisos del navegador en tu celular o usa el botón de Dictado por Teclado abajo."
      );
      setShowTextDictation(true);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Función que estructura localmente o simula IA cuando no hay API Key aún configurada en modo demo
  const buildLocalStructuredFallback = (rawText: string): StructuredMedicalNote => {
    const clean = rawText
      .replace(/\b(eh+|este+|bueno|digamos|o sea|pues)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      enfermedadActual:
        clean ||
        `Paciente de ${patient.edad} años valorado en jornada de salud en El Cairo por cuadro de ${patient.motivoInicial || "consulta médica"}.`,
      antecedentes:
        "Referidos durante el dictado clínico. Sin alergias medicamentosas conocidas reportadas adicionalmente.",
      examenFisico:
        "Paciente alerta, orientado, hidratado, signos vitales estables evaluados en consultorio de brigada.",
      impresionDiagnostica: `Diagnóstico clínico asociado a: ${
        patient.motivoInicial || "Valoración por " + patient.especialidad
      }`,
      planYJustificacion: `${
        requiereRemision ? "Se solicita remisión prioritaria. " : ""
      }${
        requiereExamenes ? "Se solicitan exámenes paraclínicos de extensión. " : ""
      }${
        requiereSeguimiento ? "Se indica control y seguimiento médico. " : ""
      }${detalleDestino ? "Detalle específico: " + detalleDestino + "." : ""}`,
      resumenEjecutivo: `${patient.motivoInicial || "Atención en jornada"} - ${
        detalleDestino || "Evaluado por " + patient.especialidad
      }`.slice(0, 175),
    };
  };

  const handleProcessWithAI = async () => {
    setAiError(null);
    setAiSuccessMsg(null);

    if (!audioBlob && !rawDictationText.trim()) {
      setAiError("Primero graba el audio con el análisis del paciente o escribe/dicta en el cuadro de texto.");
      return;
    }

    // Si no hay conexión a internet y hay un audio grabado, lo guardamos en la cola offline
    if (!isOnline && audioBlob) {
      try {
        setIsProcessingAI(true);
        const base64 = await blobToBase64(audioBlob);
        const offlineRecord: OfflineAudioRecord = {
          patientId: patient.id,
          patientName: patient.nombre,
          audioBase64: base64,
          mimeType: audioMimeType,
          createdAt: new Date().toLocaleString("es-CO"),
          doctorName: activeDoctor,
          triageFlags: {
            requiereSeguimiento,
            requiereExamenes,
            requiereRemision,
            detalleDestino,
          },
        };

        const updatedPatient: Patient = {
          ...patient,
          estado: "pendiente_ia",
          requiereSeguimiento,
          requiereExamenes,
          requiereRemision,
          detalleDestino,
          medicoAtendio: activeDoctor,
          fechaAtencion: new Date().toLocaleString("es-CO"),
          tieneAudioPendiente: true,
        };

        await onQueueOfflineAudio(offlineRecord, updatedPatient);
        setIsProcessingAI(false);
        onClose();
        return;
      } catch (err) {
        console.error(err);
        setIsProcessingAI(false);
        setAiError("Error guardando el audio en la memoria offline.");
        return;
      }
    }

    try {
      setIsProcessingAI(true);
      let base64Audio: string | undefined = undefined;
      if (audioBlob) {
        base64Audio = await blobToBase64(audioBlob);
      }

      const response = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: audioMimeType,
          dictationText: rawDictationText.trim() || undefined,
          customApiKey,
          patientInfo: {
            nombre: patient.nombre,
            edad: patient.edad,
            sexo: patient.sexo,
            especialidad: patient.especialidad,
            motivoInicial: patient.motivoInicial,
          },
          triageFlags: {
            requiereSeguimiento,
            requiereExamenes,
            requiereRemision,
            detalleDestino,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Si falta la API Key en pruebas locales, ofrecemos estructuración asistida o aviso claro
        if (data?.missingKey && rawDictationText.trim()) {
          const fallback = buildLocalStructuredFallback(rawDictationText);
          setNote(fallback);
          setAiError(
            "Nota: Aún no has configurado la GEMINI_API_KEY en Vercel/Ajustes. Se generó un borrador local básico; al colocar la API Key, Gemini estructurará el audio completo."
          );
        } else {
          setAiError(
            data?.error ||
              "Error al comunicarse con el servidor de IA. Si la señal es débil, puedes guardar el audio en cola offline."
          );
        }
        setIsProcessingAI(false);
        return;
      }

      if (data?.structured) {
        setNote({
          enfermedadActual: data.structured.enfermedadActual || "",
          antecedentes: data.structured.antecedentes || "",
          examenFisico: data.structured.examenFisico || "",
          impresionDiagnostica: data.structured.impresionDiagnostica || "",
          planYJustificacion: data.structured.planYJustificacion || "",
          resumenEjecutivo: data.structured.resumenEjecutivo || "",
        });
        setAiSuccessMsg(
          "¡Análisis estructurado con éxito! Revisa o edita cualquier campo antes de guardar."
        );
      }
    } catch (err) {
      console.error(err);
      setAiError(
        "Falló la conexión de red durante el envío. Puedes guardar el audio en modo Offline para sincronizarlo luego."
      );
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleLoadDemoDictation = () => {
    setShowTextDictation(true);
    setRequiereSeguimiento(true);
    setRequiereExamenes(true);
    setRequiereRemision(true);
    setDetalleDestino(
      "Ecocardiograma TT, Péptido Natriurético, Creatinina + Valoración prioritaria por Cardiología"
    );

    const demoRaw = `Eh... bueno, estamos viendo al paciente ${patient.nombre}, de ${patient.edad} años, acá en la jornada de El Cairo... este... el paciente consulta porque desde hace como unos dos meses viene con ahogo, con disnea cuando camina dos cuadras en subida en la vereda y además se le están hinchando los tobillos en la tarde, ortopnea de dos almohadas. Eh... de antecedentes importantes es hipertenso hace 12 años, toma losartán de 50 miligramos, perdón, toma losartán de 50 cada 12 horas e hidroclorotiazida de 25 al día, pero a veces la suspende, no es alérgico a medicamentos, ex-fumador pesado. Al examen físico lo encontramos con presión arterial de 145/90, no perdón, 158/94 mmHg, frecuencia cardíaca de 92 latidos por minuto, saturando 91% al ambiente. Tiene ingurgitación yugular grado II, ruidos cardíacos rítmicos con soplo sistólico grado II/VI en foco mitral, estertores crepitantes bibasales en ambos campos pulmonares y edema grado II con fóvea en miembros inferiores. Por todo esto consideramos una falla cardíaca descompensada probablemente de origen hipertensivo o valvular, por lo cual solicitamos ecocardiograma transtorácico, creatinina, electrolitos, hemograma, radiografía de tórax y lo remitimos a Cardiología para ajuste de terapia modificadora de la enfermedad y seguimiento estricto.`;

    setRawDictationText(demoRaw);

    // También llenamos la versión estructurada limpia para que el usuario vea el resultado inmediato
    setNote({
      enfermedadActual: `Paciente de ${patient.edad} años quien consulta por cuadro clínico de aproximadamente 2 meses de evolución consistente en deterioro de su clase funcional con disnea de medianos esfuerzos (NYHA II-III al caminar en pendiente), asociada a ortopnea de dos almohadas y edema vespertino progresivo en miembros inferiores.`,
      antecedentes:
        "Patológicos: Hipertensión arterial crónica de 12 años de evolución. Farmacológicos: Losartán 50 mg vía oral cada 12 horas e Hidroclorotiazida 25 mg vía oral día (adherencia irregular). Tóxicos: Ex-tabaquista pesado. Alérgicos: Niega alergias medicamentosas.",
      examenFisico:
        "TA: 158/94 mmHg, FC: 92 lpm, SpO2: 91% al aire ambiente. Cuello con ingurgitación yugular grado II. Cardiopulmonar: Ruidos cardíacos rítmicos con soplo holosistólico grado II/VI en foco mitral; murmullo vesicular disminuido en bases con estertores crepitantes bibasales. Extremidades: Edema bimaleolar grado II con fóvea positiva.",
      impresionDiagnostica:
        "I50.9 - Insuficiencia cardíaca congestiva descompensada (Estadío C, NYHA III) / I11.0 - Enfermedad cardíaca hipertensiva con insuficiencia cardíaca / I34.0 - Insuficiencia mitral no reumática en estudio.",
      planYJustificacion:
        "Se optimiza manejo antihipertensivo y diurético ambulatorio con educación en restricción hídrica y signos de alarma. Dada la presencia de signos clínicos francos de sobrecarga hídrica (estertores bibasales, ingurgitación yugular, edema periférico) y soplo mitral, se solicita Ecocardiograma Transtorácico, Radiografía de Tórax, Creatinina sérica, Ionograma y Hemograma. Se genera remisión prioritaria a Cardiología y Medicina Interna para titulación de terapia cuádruple y seguimiento estrecho.",
      resumenEjecutivo:
        "Falla cardíaca descompensada NYHA III + HTA no controlada. Requiere Ecocardiograma, función renal y remisión prioritaria a Cardiología.",
    });

    setAiSuccessMsg(
      "Simulación cargada: Observa cómo el dictado con muletillas y autocorrecciones se convierte en un análisis clínico estructurado."
    );
  };

  const handleSaveAndFinish = async (openPrintAfter = false) => {
    setIsSaving(true);
    const hasContent =
      note.enfermedadActual.trim() ||
      note.examenFisico.trim() ||
      note.planYJustificacion.trim();

    const updated: Patient = {
      ...patient,
      estado: "atendido",
      requiereSeguimiento,
      requiereExamenes,
      requiereRemision,
      detalleDestino: detalleDestino.trim(),
      medicoAtendio: activeDoctor,
      fechaAtencion: new Date().toLocaleString("es-CO"),
      transcripcionCruda: rawDictationText.trim(),
      tieneAudioPendiente: false,
      analisisEstructurado: hasContent
        ? note
        : buildLocalStructuredFallback(rawDictationText),
    };

    await onSavePatient(updated);
    setIsSaving(false);

    if (openPrintAfter) {
      onOpenPrintModal(updated);
    } else {
      onClose();
    }
  };

  const handleSaveOfflineQueueManual = async () => {
    if (!audioBlob) return;
    setIsSaving(true);
    const base64 = await blobToBase64(audioBlob);
    const offlineRecord: OfflineAudioRecord = {
      patientId: patient.id,
      patientName: patient.nombre,
      audioBase64: base64,
      mimeType: audioMimeType,
      createdAt: new Date().toLocaleString("es-CO"),
      doctorName: activeDoctor,
      triageFlags: {
        requiereSeguimiento,
        requiereExamenes,
        requiereRemision,
        detalleDestino,
      },
    };

    const updatedPatient: Patient = {
      ...patient,
      estado: "pendiente_ia",
      requiereSeguimiento,
      requiereExamenes,
      requiereRemision,
      detalleDestino,
      medicoAtendio: activeDoctor,
      fechaAtencion: new Date().toLocaleString("es-CO"),
      tieneAudioPendiente: true,
    };

    await onQueueOfflineAudio(offlineRecord, updatedPatient);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-100 flex flex-col overflow-hidden">
      {/* Barra superior fija */}
      <div className="bg-pueblo-700 text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        <div className="text-center">
          <span className="text-[11px] uppercase tracking-wider text-pueblo-200 block font-semibold">
            {getCanonicalSpecialty(patient.especialidad)}
          </span>
          <span className="text-xs font-bold">{cleanMojibake(activeDoctor)}</span>
        </div>
        <div className="w-16 text-right">
          {!isOnline && (
            <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Contenido desplazable */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 max-w-2xl w-full mx-auto space-y-4 pb-28">
        {/* Tarjeta resumen del paciente */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-pueblo-100 text-pueblo-900 border border-pueblo-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg">
                  {getCanonicalSpecialty(patient.especialidad)}
                </span>
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                  {patient.tipoDocumento || "CC"} {patient.documento || "Sin número"}
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-gray-900 leading-snug">
                {cleanMojibake(patient.nombre)}
              </h2>
              <p className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-2 flex-wrap">
                <strong className="text-gray-800">{patient.edad} años</strong>
                <span className="text-gray-300">•</span>
                <span>📞 {patient.telefono && patient.telefono !== "0" && patient.telefono.trim() !== "" ? patient.telefono : "Sin teléfono"}</span>
              </p>
            </div>
          </div>
          {patient.motivoInicial && (
            <div className="mt-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl px-3 py-2 text-xs text-amber-900">
              <strong className="font-bold">Motivo registrado: </strong>
              {cleanMojibake(patient.motivoInicial)}
            </div>
          )}
        </div>

        {/* PASO 1: CHECKLIST DE CONDUCTA (Botones táctiles grandes) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
              1. ¿Qué requiere el paciente? (Selecciona uno o varios)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Botón Seguimiento */}
            <button
              type="button"
              onClick={() => setRequiereSeguimiento(!requiereSeguimiento)}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 ${
                requiereSeguimiento
                  ? "bg-amber-50 border-amber-500 text-amber-900 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <CalendarClock
                className={`w-6 h-6 ${
                  requiereSeguimiento ? "text-amber-600" : "text-gray-400"
                }`}
              />
              <span className="text-xs font-extrabold leading-tight">
                Seguimiento
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  requiereSeguimiento
                    ? "bg-amber-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {requiereSeguimiento ? "SÍ" : "NO"}
              </span>
            </button>

            {/* Botón Exámenes */}
            <button
              type="button"
              onClick={() => setRequiereExamenes(!requiereExamenes)}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 ${
                requiereExamenes
                  ? "bg-blue-50 border-blue-500 text-blue-900 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <FlaskConical
                className={`w-6 h-6 ${
                  requiereExamenes ? "text-blue-600" : "text-gray-400"
                }`}
              />
              <span className="text-xs font-extrabold leading-tight">
                Exámenes
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  requiereExamenes
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {requiereExamenes ? "SÍ" : "NO"}
              </span>
            </button>

            {/* Botón Remisión */}
            <button
              type="button"
              onClick={() => setRequiereRemision(!requiereRemision)}
              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 text-center transition active:scale-95 ${
                requiereRemision
                  ? "bg-red-50 border-red-500 text-red-900 shadow-sm"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}
            >
              <Ambulance
                className={`w-6 h-6 ${
                  requiereRemision ? "text-red-600" : "text-gray-400"
                }`}
              />
              <span className="text-xs font-extrabold leading-tight">
                Remisión
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  requiereRemision
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {requiereRemision ? "SÍ" : "NO"}
              </span>
            </button>
          </div>

          {(requiereSeguimiento || requiereExamenes || requiereRemision) && (
            <div className="pt-1">
              <label className="text-[11px] font-bold text-gray-600 block mb-1">
                Especialidad a remitir o exámenes específicos (Opcional, también puedes decirlo en el audio):
              </label>
              <input
                type="text"
                value={detalleDestino}
                onChange={(e) => setDetalleDestino(e.target.value)}
                placeholder="Ej. Remisión a Cardiología + Ecocardiograma y Creatinina"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teja-500"
              />
            </div>
          )}
        </div>

        {/* PASO 2: GRABADORA DE AUDIO Y DICTADO MÉDICO */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
              2. Grabar Análisis Clínico por Voz
            </h3>
            <button
              type="button"
              onClick={handleLoadDemoDictation}
              className="text-[11px] font-bold text-teja-600 hover:text-teja-700 underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Probar ejemplo con IA
            </button>
          </div>

          {/* Guía rápida para el dictado */}
          <div className="bg-pueblo-50 border border-pueblo-200 rounded-xl p-3 text-xs text-pueblo-900">
            <p className="font-bold mb-1 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-pueblo-600" />
              Guía rápida al hablar (la IA eliminará muletillas y ruido):
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-pueblo-800 font-medium">
              <li>
                <strong>Enfermedad actual:</strong> síntomas y tiempo de evolución.
              </li>
              <li>
                <strong>Antecedentes relevantes:</strong> patológicos, fármacos, alergias.
              </li>
              <li>
                <strong>Examen físico:</strong> signos vitales y hallazgos positivos.
              </li>
              <li>
                <strong>Justificación:</strong> motivo por el que remites o pides exámenes.
              </li>
            </ol>
          </div>

          {/* Zona táctil de Grabación */}
          <div className="flex flex-col items-center justify-center py-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-full py-4 bg-gradient-to-r from-teja-600 to-teja-500 hover:from-teja-700 hover:to-teja-600 active:scale-[0.99] text-white rounded-2xl shadow-lg flex items-center justify-center gap-3 font-extrabold text-base transition"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Mic className="w-6 h-6" />
                </div>
                <span>
                  {audioBlob ? "Grabar Nuevo Audio" : "Presionar para Grabar Audio"}
                </span>
              </button>
            ) : (
              <div className="w-full bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-red-600 font-extrabold text-lg">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                  <span>Grabando... {formatTime(recordingSeconds)}</span>
                </div>
                <p className="text-xs text-red-700 text-center">
                  Habla con naturalidad. Si te corriges durante el audio, la IA tomará el último dato válido.
                </p>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl shadow flex items-center justify-center gap-2 transition"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Detener Grabación
                </button>
              </div>
            )}
          </div>

          {/* Reproductor si ya hay audio grabado */}
          {audioUrl && !isRecording && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-pueblo-600" />
                  Audio capturado ({formatTime(recordingSeconds)})
                </span>
                <span className="text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  Listo para IA
                </span>
              </div>
              <audio src={audioUrl} controls className="w-full h-10" />
            </div>
          )}

          {/* Opción alternativa de dictado por teclado del celular */}
          <div>
            <button
              type="button"
              onClick={() => setShowTextDictation(!showTextDictation)}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1.5"
            >
              <Keyboard className="w-4 h-4" />
              {showTextDictation
                ? "Ocultar cuadro de dictado libre / texto"
                : "¿Prefieres usar el micrófono del teclado o pegar texto? Toca aquí"}
            </button>

            {showTextDictation && (
              <div className="mt-2">
                <textarea
                  rows={4}
                  value={rawDictationText}
                  onChange={(e) => setRawDictationText(e.target.value)}
                  placeholder="Aquí puedes dictar con el micrófono del teclado del teléfono o escribir apuntes rápidos desordenados para que la IA los estructure..."
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-pueblo-500"
                />
              </div>
            )}
          </div>

          {/* Botón para enviar a Gemini Flash y estructurar */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={isProcessingAI || isRecording}
              onClick={handleProcessWithAI}
              className="flex-1 py-3.5 bg-pueblo-600 hover:bg-pueblo-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              {isProcessingAI ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Procesando y Estructurando con IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Convertir en Análisis Médico Estructurado</span>
                </>
              )}
            </button>

            {audioBlob && (
              <button
                type="button"
                onClick={handleSaveOfflineQueueManual}
                className="py-3 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                title="Guarda el audio en el teléfono para procesarlo más tarde si la señal está lenta"
              >
                <WifiOff className="w-4 h-4" />
                Guardar en Cola Offline
              </button>
            )}
          </div>

          {aiError && (
            <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{aiError}</span>
            </div>
          )}

          {aiSuccessMsg && (
            <div className="bg-green-50 border border-green-300 text-green-900 p-3 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <span>{aiSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* PASO 3: ESTRUCTURA DEL ANÁLISIS MÉDICO (EDITABLE) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 space-y-3.5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-pueblo-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teja-600" />
              3. Estructura de Análisis Médico (Editable)
            </h3>
            <span className="text-[11px] text-gray-400">
              Puedes editar cualquier texto
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              1. Enfermedad Actual
            </label>
            <textarea
              rows={3}
              value={note.enfermedadActual}
              onChange={(e) =>
                setNote({ ...note, enfermedadActual: e.target.value })
              }
              placeholder="Síntesis cronológica de la enfermedad actual..."
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-pueblo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              2. Antecedentes Relevantes
            </label>
            <textarea
              rows={2}
              value={note.antecedentes}
              onChange={(e) =>
                setNote({ ...note, antecedentes: e.target.value })
              }
              placeholder="Patológicos, farmacológicos, quirúrgicos, alérgicos..."
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-pueblo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              3. Hallazgos al Examen Físico
            </label>
            <textarea
              rows={3}
              value={note.examenFisico}
              onChange={(e) =>
                setNote({ ...note, examenFisico: e.target.value })
              }
              placeholder="Signos vitales y hallazgos positivos/negativos relevantes..."
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-pueblo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-teja-700 block mb-1">
              4. Impresión Diagnóstica (CIE-10)
            </label>
            <input
              type="text"
              value={note.impresionDiagnostica}
              onChange={(e) =>
                setNote({ ...note, impresionDiagnostica: e.target.value })
              }
              placeholder="Ej. I10X - Hipertensión esencial primaria"
              className="w-full border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-teja-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-teja-700 block mb-1">
              5. Plan de Manejo y Motivo / Justificación de Remisión o Exámenes
            </label>
            <textarea
              rows={4}
              value={note.planYJustificacion}
              onChange={(e) =>
                setNote({ ...note, planYJustificacion: e.target.value })
              }
              placeholder="Justificación clínica clara para orden de exámenes, remisión a especialidad y plan de seguimiento..."
              className="w-full border border-teja-300 bg-teja-50/30 rounded-xl p-2.5 text-xs leading-relaxed focus:ring-2 focus:ring-teja-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Barra inferior fija de guardado rápido */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-3 shadow-2xl z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveAndFinish(true)}
            className="py-3.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shrink-0"
          >
            <FileText className="w-4 h-4 text-teja-600" />
            Guardar y Ver Orden
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveAndFinish(false)}
            className="flex-1 py-3.5 bg-teja-600 hover:bg-teja-700 text-white font-extrabold text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSaving ? "Guardando..." : "Guardar Atención"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
