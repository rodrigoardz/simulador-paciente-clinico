/**
 * SimClinico - Módulo de API para Qwen (DashScope)
 * Maneja las llamadas a la API de Qwen con endpoint compatible OpenAI
 */

const APIConfig = {
    baseURL: 'https://ws-hzitm9joq5w4mrdn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-plus'
};

/**
 * Obtiene la API key del localStorage
 */
function getApiKey() {
    return localStorage.getItem('simclinico_api_key');
}

/**
 * Guarda la API key en localStorage
 */
function saveApiKey(key) {
    localStorage.setItem('simclinico_api_key', key);
}

/**
 * Verifica si hay una API key configurada
 */
function hasApiKey() {
    return !!getApiKey();
}

/**
 * Llama a la API de Qwen con retry básico
 * @param {string} systemPrompt - El prompt del sistema que define el rol
 * @param {string} userMessage - El mensaje del usuario
 * @param {number} maxRetries - Número máximo de reintentos
 */
async function callQwenAPI(systemPrompt, userMessage, maxRetries = 2) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('API key no configurada. Ve a Configuración para añadir tu clave.');
    }
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(APIConfig.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: APIConfig.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                if (response.status === 401) {
                    throw new Error('API key inválida. Verifica tu configuración.');
                } else if (response.status === 429) {
                    throw new Error('Límite de速率 alcanzado. Espera unos segundos.');
                } else if (response.status >= 500) {
                    throw new Error(`Error del servidor (${response.status}). Reintentando...`);
                } else {
                    throw new Error(errorData.message || `Error HTTP ${response.status}`);
                }
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Respuesta inesperada de la API');
            }
            
            return data.choices[0].message.content;
            
        } catch (error) {
            lastError = error;
            
            // Si es el último intento, lanzar el error
            if (attempt === maxRetries) {
                break;
            }
            
            // Esperar antes de reintentar (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
    }
    
    throw lastError || new Error('Error desconocido en la API');
}

/**
 * Parsea una respuesta JSON de la LLM
 * Intenta extraer JSON incluso si hay texto adicional
 * @param {string} text - Texto de respuesta potencialmente con JSON
 */
function parseLLMResponse(text) {
    if (!text) {
        throw new Error('Respuesta vacía de la LLM');
    }
    
    // Intento 1: Parse directo
    try {
        return JSON.parse(text.trim());
    } catch (e) {
        // Intento 2: Buscar bloques JSON entre llaves
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                // Intento 3: Buscar entre backticks de markdown
                const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (markdownMatch) {
                    try {
                        return JSON.parse(markdownMatch[1].trim());
                    } catch (e3) {
                        throw new Error('No se pudo parsear la respuesta JSON: ' + e3.message);
                    }
                }
            }
        }
    }
    
    throw new Error('No se encontró JSON válido en la respuesta: ' + text.substring(0, 200));
}

/**
 * Genera un caso clínico inicial
 * @param {string} pathology - Patología a simular
 * @param {string} difficulty - Nivel de dificultad
 */
async function generateCase(pathology, difficulty) {
    const userMessage = `Genera un caso clínico de: "${pathology}"
Nivel de dificultad: ${difficulty}

Importante:
- El paciente debe ser realista y coherente
- Los signos vitales deben reflejar la fisiopatología
- Incluye antecedentes relevantes
- Responde SOLO con el JSON especificado en el prompt del sistema`;

    const response = await callQwenAPI(PROMPTS.CLINICAL_ENGINE, userMessage);
    return parseLLMResponse(response);
}

/**
 * Obtiene respuesta del paciente simulado
 * @param {string} question - Pregunta del usuario
 * @param {object} patientContext - Contexto oculto del paciente
 */
async function getPatientResponse(question, patientContext) {
    const userMessage = `El estudiante pregunta: "${question}"

Contexto del paciente (NO revelar directamente):
- Diagnóstico oculto: ${patientContext.diagnostico_principal}
- Gravedad: ${patientContext.gravedad}

Responde como el paciente en primera persona.
Responde SOLO con el JSON especificado en el prompt del sistema.`;

    const response = await callQwenAPI(PROMPTS.PATIENT, userMessage);
    return parseLLMResponse(response);
}

/**
 * Procesa examen físico o estudios solicitados
 * @param {string} action - Tipo de acción (examen o estudio)
 * @param {string} details - Detalles de lo solicitado
 * @param {object} patientContext - Contexto completo del paciente
 */
async function processClinicalAction(action, details, patientContext, vitals) {
    const userMessage = `Acción clínica: ${action}
Detalle: ${details}

Estado actual del paciente:
- Diagnóstico oculto: ${patientContext.diagnostico_principal}
- Gravedad: ${patientContext.gravedad}
- Signos vitales actuales: TA ${vitals.ta_sistolica}/${vitals.ta_diastolica}, FC ${vitals.fc}, FR ${vitals.fr}, Temp ${vitals.temperatura}°C, SatO2 ${vitals.sato2}%

Proporciona:
1. Hallazgos coherentes con la patología
2. Actualización de signos vitales si corresponde
3. Tiempo transcurrido
4. Cambios en el estado clínico

Responde SOLO con el JSON especificado en el prompt del sistema para EVOLUCIÓN.`;

    const response = await callQwenAPI(PROMPTS.CLINICAL_ENGINE, userMessage);
    return parseLLMResponse(response);
}

/**
 * Genera evaluación final del caso
 * @param {object} caseSummary - Resumen completo del caso
 */
async function generateEvaluation(caseSummary) {
    const userMessage = `Evalúa el desempeño del estudiante en este caso:

PATOLOGÍA: ${caseSummary.pathology}
DIFICULTAD: ${caseSummary.difficulty}

RESUMEN DE ACCIONES:
${JSON.stringify(caseSummary.actionsSummary, null, 2)}

INTERACCIONES REALIZADAS: ${caseSummary.totalInteractions}

DIAGNÓSTICO DEL ESTUDIANTE: ${caseSummary.userDiagnosis || 'No proporcionado'}
TRATAMIENTO PROPUESTO: ${caseSummary.userTreatment || 'No proporcionado'}

CUADRO OCULTO DEL PACIENTE:
${JSON.stringify(caseSummary.hiddenContext, null, 2)}

Genera una evaluación completa basada en guías clínicas vigentes.
Responde SOLO con el JSON especificado en el prompt del sistema TUTOR.`;

    const response = await callQwenAPI(PROMPTS.TUTOR, userMessage);
    return parseLLMResponse(response);
}

// Exportar funciones para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getApiKey,
        saveApiKey,
        hasApiKey,
        callQwenAPI,
        parseLLMResponse,
        generateCase,
        getPatientResponse,
        processClinicalAction,
        generateEvaluation
    };
}
