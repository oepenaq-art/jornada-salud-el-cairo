# Jornada de Salud - Fundación "Tejas para mi Pueblo" (El Cairo, Valle del Cauca)

Aplicación web móvil (Mobile-First) para la atención médica rápida, marcación de conducta (**Seguimiento, Exámenes, Remisión**), grabación de audio clínico y estructuración automática mediante **Google Gemini Flash**.

---

## Características Principales

1. **100% Táctil para Celulares**: Diseñada para uso con una sola mano durante la brigada médica.
2. **Carga de Pacientes por Especialidad**: Pre-cargados en código (`src/data/initialData.ts`) o importables vía Excel (`.xlsx` / `.csv`).
3. **Checklist de Conducta**: Botones grandes para marcar si el paciente requiere **Seguimiento**, **Exámenes** o **Remisión**.
4. **Dictado Médico con IA (Audio directo a Estructura)**:
   - Graba el análisis hablado del médico.
   - Elimina muletillas, ruido ambiente y autocorrecciones.
   - Organiza la información en:
     1. Enfermedad Actual
     2. Antecedentes Relevantes
     3. Hallazgos al Examen Físico
     4. Impresión Diagnóstica (CIE-10)
     5. Plan de Manejo y Justificación Clínica de Remisión / Exámenes
5. **Resiliencia Offline (`IndexedDB`)**: Si la señal falla en El Cairo, el audio se guarda en la memoria del teléfono y se sincroniza cuando vuelve la conexión.
6. **Una sola API Key en Vercel**: Configurando `GEMINI_API_KEY` en Vercel, ningún médico necesita ingresar claves.

---

## Cómo Desplegar en Vercel

1. Sube esta carpeta a un repositorio en **GitHub** (o usa Vercel CLI).
2. Entra a [vercel.com](https://vercel.com) -> **Add New Project** e importa el repositorio.
3. En la sección **Environment Variables** de Vercel, agrega:
   - Nombre: `GEMINI_API_KEY`
   - Valor: *(Tu API Key de Google AI Studio / Gemini)*
4. Haz clic en **Deploy**.
5. Comparte el enlace generado con los médicos de la jornada.
