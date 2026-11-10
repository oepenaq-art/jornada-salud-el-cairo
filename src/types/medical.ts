export type PatientStatus = "pendiente" | "en_atencion" | "atendido" | "pendiente_ia";

export interface StructuredMedicalNote {
  enfermedadActual: string;
  antecedentes: string;
  examenFisico: string;
  impresionDiagnostica: string;
  planYJustificacion: string;
  resumenEjecutivo?: string;
}

export interface Patient {
  id: string;
  documento: string;
  tipoDocumento: "CC" | "TI" | "RC" | "CE" | "PT";
  nombre: string;
  edad: number;
  sexo: "F" | "M" | "Otro";
  telefono?: string;
  veredaBarrio?: string;
  especialidad: string;
  motivoInicial?: string;
  estado: PatientStatus;
  // Triage / Conducta marcada por el médico
  requiereSeguimiento: boolean;
  requiereExamenes: boolean;
  requiereRemision: boolean;
  detalleDestino?: string; // Ej: "Remisión a Cardiología" o "Hemograma, Creatinina"
  // Datos de la atención
  medicoAtendio?: string;
  medicoDocumento?: string;
  fechaAtencion?: string;
  analisisEstructurado?: StructuredMedicalNote;
  transcripcionCruda?: string;
  tieneAudioPendiente?: boolean;
}

export interface Doctor {
  id: string;
  nombre: string;
  documento?: string; // Cédula de Ciudadanía (CC)
  especialidad: string;
  registroMedico?: string;
  telefono?: string;
  email?: string;
  lugarAtencion?: string;
}

export interface OfflineAudioRecord {
  patientId: string;
  patientName: string;
  audioBase64: string;
  mimeType: string;
  createdAt: string;
  doctorName: string;
  doctorDoc?: string;
  triageFlags: {
    requiereSeguimiento: boolean;
    requiereExamenes: boolean;
    requiereRemision: boolean;
    detalleDestino?: string;
  };
}
