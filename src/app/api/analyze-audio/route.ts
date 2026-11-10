import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Eres un médico auditor clínico colombiano experto en redacción de historias clínicas, epicrisis y formatos de referencia/remisión médica para brigadas de salud en Colombia (Fundación "Tejas para mi Pueblo" - Jornada de Salud en El Cairo, Valle del Cauca).

Tu tarea es escuchar el audio dictado por el médico (o procesar el texto clínico) y transformarlo en un ANÁLISIS MÉDICO ESTRUCTURADO, impecable, profesional y conciso.

REGLAS ESTRICTAS:
1. ELIMINAR RUIDO Y REDUNDANCIAS: Elimina muletillas ("eh", "este", "bueno", "digamos", "entonces"), silencios, ruidos de fondo y repeticiones.
2. AUTOCORRECCIÓN CLÍNICA: Si el médico se corrige durante el audio (ej. "presión de 130/80, perdón 150/95"), conserva únicamente el dato corregido final.
3. TERMINOLOGÍA MÉDICA: Corrige errores fonéticos en nombres de medicamentos (DCI/genéricos en Colombia), signos clínicos, hallazgos semiológicos y paraclínicos.
4. FIDELIDAD CLÍNICA: No inventes signos vitales ni hallazgos que el médico no haya mencionado. Si algún apartado no fue detallado, redacta "No referido en el dictado" o sintetiza con precisión lo reportado.
5. JUSTIFICACIÓN DE CONDUCTA: En el apartado de "planYJustificacion", deja muy clara la justificación clínica de por qué el paciente requiere los exámenes solicitados, la remisión a especialista o el seguimiento prioritario, para facilitar la autorización ante su EPS o red de apoyo de la Fundación.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta (sin bloques markdown adicionales si es posible):
{
  "enfermedadActual": "Redacción técnica y cronológica del cuadro clínico actual, síntomas principales y evolución.",
  "antecedentes": "Antecedentes patológicos, farmacológicos (con dosis si se mencionan), quirúrgicos, alérgicos, tóxicos o familiares relevantes.",
  "examenFisico": "Signos vitales mencionados y hallazgos positivos y negativos relevantes al examen físico segmentario.",
  "impresionDiagnostica": "Diagnóstico(s) clínico(s) principal y secundarios con código CIE-10 sugerido entre paréntesis.",
  "planYJustificacion": "Conducta instaurada, listado de exámenes solicitados y/o especialidad a la que se remite, redactando una sólida justificación clínica del motivo de remisión o estudio.",
  "resumenEjecutivo": "Resumen ejecutivo de máximo 180 caracteres para la tabla consolidada de seguimiento de la Fundación."
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      audioBase64,
      mimeType = "audio/webm",
      patientInfo,
      triageFlags,
      customApiKey,
      dictationText,
    } = body;

    const apiKey = process.env.GEMINI_API_KEY || customApiKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No se encontró la GEMINI_API_KEY. Configúrala en las variables de entorno de Vercel o ingrésala una sola vez en el Panel de Coordinación.",
          missingKey: true,
        },
        { status: 400 }
      );
    }

    const contextHeader = `
DATOS DEL PACIENTE EN ATENCIÓN:
- Nombre: ${patientInfo?.nombre || "Paciente"}
- Edad / Sexo: ${patientInfo?.edad || ""} años (${patientInfo?.sexo || ""})
- Especialidad que atiende: ${patientInfo?.especialidad || "Medicina General"}
- Motivo inicial registrado: ${patientInfo?.motivoInicial || "Valoración en jornada"}
- Marcadores seleccionados por el médico:
  * Requiere Seguimiento: ${triageFlags?.requiereSeguimiento ? "SÍ" : "NO"}
  * Requiere Exámenes: ${triageFlags?.requiereExamenes ? "SÍ" : "NO"}
  * Requiere Remisión: ${triageFlags?.requiereRemision ? "SÍ" : "NO"}
  * Destino / Exámenes anotados: ${triageFlags?.detalleDestino || "Según dictado de voz"}
`;

    const parts: Array<Record<string, unknown>> = [
      {
        text: `${SYSTEM_PROMPT}\n\n${contextHeader}\n\nAnaliza el siguiente registro del médico y devuelve exclusivamente el JSON estructurado:`,
      },
    ];

    if (audioBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType.split(";")[0] || "audio/webm",
          data: audioBase64,
        },
      });
    } else if (dictationText) {
      parts.push({
        text: `DICTADO / NOTA DEL MÉDICO:\n${dictationText}`,
      });
    } else {
      return NextResponse.json(
        { error: "No se recibió audio ni texto para analizar." },
        { status: 400 }
      );
    }

    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError = "";

    for (const modelName of modelsToTry) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `Modelo ${modelName}: ${response.status} - ${errText}`;
        continue;
      }

      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!rawText) {
        lastError = "Respuesta vacía del modelo.";
        continue;
      }

      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

      const structured = JSON.parse(cleaned);
      return NextResponse.json({
        success: true,
        model: modelName,
        structured,
      });
    }

    return NextResponse.json(
      {
        error: `No fue posible procesar el audio con Gemini. Detalle: ${lastError}`,
      },
      { status: 500 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error procesando análisis médico: ${msg}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
    service: "Jornada de Salud - Tejas para mi Pueblo (El Cairo, Valle)",
  });
}
