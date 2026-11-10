import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import { Patient } from "../types/medical";

let firestoreDb: Firestore | null = null;

export interface FirebaseConfigInput {
  apiKey: string;
  projectId: string;
  appId?: string;
}

export function getFirebaseConfig(): FirebaseConfigInput | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("tejas_firebase_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey && parsed.projectId) return parsed;
      } catch {
        // ignore
      }
    }
  }
  const envKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const envProj = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (envKey && envProj) {
    return {
      apiKey: envKey,
      projectId: envProj,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
  }
  return null;
}

export function initFirebase(): Firestore | null {
  try {
    if (firestoreDb) return firestoreDb;
    const cfg = getFirebaseConfig();
    if (!cfg) return null;

    let app: FirebaseApp;
    if (!getApps().length) {
      app = initializeApp({
        apiKey: cfg.apiKey,
        projectId: cfg.projectId,
        authDomain: `${cfg.projectId}.firebaseapp.com`,
        appId: cfg.appId || "1:000000000:web:0000000",
      });
    } else {
      app = getApps()[0];
    }
    firestoreDb = getFirestore(app);
    return firestoreDb;
  } catch (err) {
    console.warn("Firebase no inicializado, operando en modo local:", err);
    return null;
  }
}

export function subscribeToCloudPatients(
  onUpdate: (patients: Patient[]) => void
): (() => void) | null {
  const db = initFirebase();
  if (!db) return null;

  try {
    const colRef = collection(db, "jornada_el_cairo_pacientes");
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list: Patient[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Patient);
        });
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (err) => {
        console.warn("Error en suscripción Firestore:", err);
      }
    );
    return unsub;
  } catch {
    return null;
  }
}

export async function syncPatientToCloud(patient: Patient): Promise<boolean> {
  const db = initFirebase();
  if (!db) return false;
  try {
    const docRef = doc(db, "jornada_el_cairo_pacientes", patient.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(patient)), { merge: true });
    return true;
  } catch (err) {
    console.warn("No se pudo sincronizar con Firebase (guardado localmente):", err);
    return false;
  }
}

export async function syncBatchPatientsToCloud(patients: Patient[]): Promise<boolean> {
  const db = initFirebase();
  if (!db) return false;
  try {
    const batch = writeBatch(db);
    for (const p of patients) {
      const docRef = doc(db, "jornada_el_cairo_pacientes", p.id);
      batch.set(docRef, JSON.parse(JSON.stringify(p)), { merge: true });
    }
    await batch.commit();
    return true;
  } catch (err) {
    console.warn("Error subiendo lote a Firebase:", err);
    return false;
  }
}
