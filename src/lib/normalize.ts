/**
 * Normaliza cadenas de texto eliminando tildes/acentos y caracteres especiales
 * para garantizar compatibilidad total en búsquedas y comparaciones en cualquier
 * navegador o sistema operativo móvil (iOS Safari, Android Chrome, etc.).
 */
export function normalizeText(str?: string | null): string {
  if (!str) return "";
  return cleanMojibake(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Corrige inconsistencias comunes de codificación (mojibake)
 * en caso de importaciones de archivos con encoding Windows-1252/ANSI
 */
export function cleanMojibake(str?: string | null): string {
  if (!str) return "";
  return String(str)
    .replace(/Odontolog[í|i|Ã­|├¡|]+a/gi, "Odontología")
    .replace(/Pediatr[í|i|Ã­|├¡|]+a/gi, "Pediatría")
    .replace(/Dermatolog[í|i|Ã­|├¡|]+a/gi, "Dermatología")
    .replace(/Urolog[í|i|Ã­|├¡|]+a/gi, "Urología")
    .replace(/Optometr[í|i|Ã­|├¡|]+a/gi, "Optometría")
    .replace(/Enfermer[í|i|Ã­|├¡|]+a/gi, "Enfermería")
    .replace(/Fisioterap[í|i|Ã­|├¡|]+a/gi, "Fisioterapia")
    .replace(/Ginecolog[í|i|Ã­|├¡|]+a/gi, "Ginecología")
    .replace(/Neumolog[í|i|Ã­|├¡|]+a/gi, "Neumología")
    .replace(/Neurolog[í|i|Ã­|├¡|]+a/gi, "Neurología")
    .replace(/valoraci[ó|o|Ã³|├│|]+n/gi, "valoración")
    .replace(/atenci[ó|o|Ã³|├│|]+n/gi, "atención")
    .replace(/remisi[ó|o|Ã³|├│|]+n/gi, "remisión")
    .replace(/ex[á|a|Ã¡|├¡|]+menes/gi, "exámenes")
    .replace(/Pati[ñ|n|Ã±|├▒|]+o/gi, "Patiño")
    .replace(/Jos[é|e|Ã©|├⌐|]+/gi, "José")
    .replace(/Mar[í|i|Ã­|├¡|]+a/gi, "María")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã /g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã /g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‘/g, "Ñ")
    .replace(/Â/g, "");
}

const CANONICAL_SPECIALTIES: Record<string, string> = {
  odontologia: "Odontología",
  pediatria: "Pediatría",
  dermatologia: "Dermatología",
  urologia: "Urología",
  optometria: "Optometría",
  enfermeria: "Enfermería",
  "medicina general": "Medicina General",
  fisioterapia: "Fisioterapia",
  ortopedia: "Ortopedia",
  "medicina interna": "Medicina Interna",
  ginecologia: "Ginecología",
  "estudiante de medicina": "Estudiante de Medicina",
  "pediatria (neumologia)": "Pediatría (Neumología)",
  "pediatria (neurologia)": "Pediatría (Neurología)",
  "pediatria (residente)": "Pediatría (Residente)",
  "medicina general (interna)": "Medicina General (Interna)",
  "medicina general (interno)": "Medicina General (Interno)",
};

/**
 * Devuelve la especialidad formateada correctamente con su tilde oficial en español.
 * Soporta especialidades múltiples separadas por coma (ej: "Pediatría, Odontología").
 */
export function getCanonicalSpecialty(esp?: string | null): string {
  if (!esp) return "Medicina General";
  const cleaned = cleanMojibake(esp);

  if (cleaned.includes(",")) {
    return cleaned
      .split(",")
      .map((part) => {
        const pNorm = normalizeText(part.trim());
        return CANONICAL_SPECIALTIES[pNorm] || part.trim();
      })
      .join(", ");
  }

  const norm = normalizeText(cleaned);
  return CANONICAL_SPECIALTIES[norm] || cleaned;
}
