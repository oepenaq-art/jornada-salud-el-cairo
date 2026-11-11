import { Doctor, OfflineAudioRecord, Patient } from "../types/medical";
import { MEDICOS_INICIALES, PACIENTES_INICIALES } from "../data/initialData";

const DB_NAME = "TejasSaludElCairoDB";
const DB_VERSION = 1;
const STORE_PATIENTS = "patients";
const STORE_AUDIO_QUEUE = "audioQueue";
const STORE_DOCTORS = "doctors";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
        db.createObjectStore(STORE_PATIENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_AUDIO_QUEUE)) {
        db.createObjectStore(STORE_AUDIO_QUEUE, { keyPath: "patientId" });
      }
      if (!db.objectStoreNames.contains(STORE_DOCTORS)) {
        db.createObjectStore(STORE_DOCTORS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const CURRENT_DATASET_VERSION = "2026_11_11_v7_clean_pac_prueba";

export async function loadPatients(): Promise<Patient[]> {
  try {
    const savedVer =
      typeof window !== "undefined"
        ? localStorage.getItem("tejas_dataset_version")
        : null;

    if (savedVer !== CURRENT_DATASET_VERSION) {
      await saveAllPatients(PACIENTES_INICIALES, true);
      if (typeof window !== "undefined") {
        localStorage.setItem("tejas_dataset_version", CURRENT_DATASET_VERSION);
      }
      return PACIENTES_INICIALES;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PATIENTS, "readonly");
      const store = tx.objectStore(STORE_PATIENTS);
      const req = store.getAll();
      req.onsuccess = async () => {
        const result = req.result as Patient[];
        if (!result || result.length === 0) {
          await saveAllPatients(PACIENTES_INICIALES, true);
          resolve(PACIENTES_INICIALES);
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return PACIENTES_INICIALES;
  }
}

export async function savePatient(patient: Patient): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PATIENTS, "readwrite");
      tx.objectStore(STORE_PATIENTS).put(patient);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Error guardando paciente en IndexedDB:", err);
  }
}

export async function saveAllPatients(patients: Patient[], replaceAll = false): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PATIENTS, "readwrite");
      const store = tx.objectStore(STORE_PATIENTS);
      if (replaceAll) {
        store.clear();
      }
      for (const p of patients) {
        store.put(p);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Error guardando lista de pacientes:", err);
  }
}

const CURRENT_DOCTORS_VERSION = "2026_11_11_v4_official32";

export async function loadDoctors(): Promise<Doctor[]> {
  try {
    const savedVer =
      typeof window !== "undefined"
        ? localStorage.getItem("tejas_doctors_version")
        : null;

    if (savedVer !== CURRENT_DOCTORS_VERSION) {
      await saveAllDoctors(MEDICOS_INICIALES, true);
      if (typeof window !== "undefined") {
        localStorage.setItem("tejas_doctors_version", CURRENT_DOCTORS_VERSION);
      }
      return MEDICOS_INICIALES;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCTORS, "readonly");
      const store = tx.objectStore(STORE_DOCTORS);
      const req = store.getAll();
      req.onsuccess = async () => {
        const result = req.result as Doctor[];
        if (!result || result.length === 0) {
          await saveAllDoctors(MEDICOS_INICIALES, true);
          resolve(MEDICOS_INICIALES);
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return MEDICOS_INICIALES;
  }
}

export async function saveAllDoctors(doctors: Doctor[], replaceAll = false): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCTORS, "readwrite");
      const store = tx.objectStore(STORE_DOCTORS);
      if (replaceAll) {
        store.clear();
      }
      for (const d of doctors) {
        store.put(d);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Error guardando médicos:", err);
  }
}

export async function saveOfflineAudio(record: OfflineAudioRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO_QUEUE, "readwrite");
    tx.objectStore(STORE_AUDIO_QUEUE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineAudioQueue(): Promise<OfflineAudioRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AUDIO_QUEUE, "readonly");
      const req = tx.objectStore(STORE_AUDIO_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineAudioRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineAudio(patientId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO_QUEUE, "readwrite");
    tx.objectStore(STORE_AUDIO_QUEUE).delete(patientId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
