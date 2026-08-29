/**
 * SimClinico - Aplicación Principal
 * Maneja la UI y el flujo de la aplicación
 */

// Referencias al DOM
const screens = {
    home: document.getElementById('screen-home'),
    case: document.getElementById('screen-case'),
    evaluation: document.getElementById('screen-evaluation')
};

const modalSettings = document.getElementById('modal-settings');

// Elementos del caso clínico
const uiElements = {
    patientName: document.getElementById('patient-name'),
    patientDetails: document.getElementById('patient-details'),
    vitalTA: document.getElementById('vital-ta'),
    vitalFC: document.getElementById('vital-fc'),
    vitalFR: document.getElementById('vital-fr'),
    vitalTemp: document.getElementById('vital-temp'),
    vitalSatO2: document.getElementById('vital-sato2'),
    simTime: document.getElementById('sim-time'),
    inputArea: document.getElementById('input-area'),
    inputLabel: document.getElementById('input-label'),
    userInput: document.getElementById('user-input'),
    interactionLog: document.getElementById('interaction-log'),
    resultsContent: document.getElementById('results-content'),
    evaluationContent: document.getElementById('evaluation-content')
};

// Estado de la acción actual
let currentActionType = null;
let isWaitingForAPI = false;

/**
 * Inicializa la aplicación
 */
function initApp() {
    setupEventListeners();
    checkApiKey();
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
    // Botón de configuración
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    
    // Botón de inicio
    document.getElementById('btn-start').addEventListener('click', startCase);
    
    // Botones de acción clínica
    document.getElementById('btn-anamnesis').addEventListener('click', () => selectAction('anamnesis'));
    document.getElementById('btn-exam').addEventListener('click', () => selectAction('examenFisico'));
    document.getElementById('btn-studies').addEventListener('click', () => selectAction('estudios'));
    document.getElementById('btn-intervene').addEventListener('click', () => selectAction('intervencion'));
    
    // Botones del área de input
    document.getElementById('btn-send').addEventListener('click', sendAction);
    document.getElementById('btn-cancel').addEventListener('click', cancelAction);
    
    // Botón de cerrar caso - ahora llama directamente a cerrarCaso()
    document.getElementById('btn-close-case').addEventListener('click', cerrarCaso);
    
    // Nueva simulación
    document.getElementById('btn-new-case').addEventListener('click', resetToHome);
    
    // Enter para enviar en textarea
    uiElements.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            sendAction();
        }
    });
}

/**
 * Verifica si hay API key configurada
 */
function checkApiKey() {
    if (!hasApiKey()) {
        setTimeout(() => {
            alert('⚠️ Bienvenido a SimClinico\n\nPara comenzar, necesitas configurar tu API key de Qwen (DashScope).\n\nVe a Configuración (⚙️) para añadirla.');
            openSettings();
        }, 500);
    }
}

/**
 * Abre el modal de configuración
 */
function openSettings() {
    const currentKey = getApiKey() || '';
    document.getElementById('api-key').value = currentKey;
    modalSettings.classList.remove('hidden');
}

/**
 * Cierra el modal de configuración
 */
function closeSettings() {
    modalSettings.classList.add('hidden');
}

/**
 * Guarda la configuración de API key
 */
function saveSettings() {
    const apiKey = document.getElementById('api-key').value.trim();
    
    if (!apiKey) {
        alert('❌ Por favor introduce una API key válida');
        return;
    }
    
    saveApiKey(apiKey);
    closeSettings();
    alert('✅ API key guardada correctamente');
}

/**
 * Cambia entre pantallas
 */
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });
    
    screens[screenName].classList.remove('hidden');
    screens[screenName].classList.add('active');
}

/**
 * Inicia un nuevo caso clínico
 */
async function startCase() {
    const pathology = document.getElementById('pathology').value.trim();
    const difficulty = document.getElementById('difficulty').value;
    
    if (!pathology) {
        alert('❌ Por favor introduce una patología');
        return;
    }
    
    if (!hasApiKey()) {
        alert('❌ Configura tu API key primero');
        openSettings();
        return;
    }
    
    // Inicializar estado
    GameState.initNewCase(pathology, difficulty);
    
    // Mostrar pantalla de carga
    showScreen('case');
    setLoading(true);
    
    try {
        // Generar caso con la LLM
        const caseData = await generateCase(pathology, difficulty);
        
        // Validar datos mínimos
        if (!caseData.nombre || !caseData.signos_vitales) {
            throw new Error('Datos del caso incompletos');
        }
        
        // Guardar información del paciente
        GameState.patient = {
            nombre: caseData.nombre,
            edad: caseData.edad,
            sexo: caseData.sexo,
            motivoConsulta: caseData.motivo_consulta
        };
        
        // Guardar cuadro oculto para referencia interna
        GameState.hiddenContext = caseData.cuadro_oculto;
        GameState.antecedentesOcultos = caseData.antecedentes_ocultos || {};
        
        // Actualizar signos vitales
        GameState.updateVitals(caseData.signos_vitales);
        
        // Actualizar UI
        updatePatientInfo();
        updateVitalsDisplay();
        updateTimeDisplay();
        
        // Registrar inicio
        addLogEntry('system', `Caso iniciado: ${GameState.patient.nombre}, ${GameState.patient.edad} años, ${GameState.patient.sexo}`);
        addLogEntry('system', `Motivo de consulta: ${GameState.patient.motivoConsulta}`);
        
        // Mensaje inicial del paciente
        uiElements.resultsContent.innerHTML = `
            <div class="patient-greeting">
                <p><strong>Paciente:</strong> "Buenos días, doctor. ${caseData.motivo_consulta}"</p>
                <p class="hint-text"><em>Comienza realizando anamnesis, examen físico o solicitando estudios.</em></p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error al generar caso:', error);
        alert(`❌ Error al iniciar el caso: ${error.message}\n\nVerifica tu API key e intenta nuevamente.`);
        resetToHome();
    } finally {
        setLoading(false);
    }
}

/**
 * Actualiza la información del paciente en la UI
 */
function updatePatientInfo() {
    uiElements.patientName.textContent = GameState.patient.nombre;
    uiElements.patientDetails.textContent = `${GameState.patient.edad} años • ${GameState.patient.sexo} • ${GameState.patient.motivoConsulta}`;
}

/**
 * Actualiza la visualización de signos vitales
 */
function updateVitalsDisplay() {
    const v = GameState.vitals;
    uiElements.vitalTA.textContent = `${v.ta_sistolica}/${v.ta_diastolica} mmHg`;
    uiElements.vitalFC.textContent = `${v.fc} lpm`;
    uiElements.vitalFR.textContent = `${v.fr} rpm`;
    uiElements.vitalTemp.textContent = `${v.temperatura}°C`;
    uiElements.vitalSatO2.textContent = `${v.sato2}%`;
    
    // Alertas visuales para valores críticos
    highlightCriticalVitals();
}

/**
 * Resalta signos vitales críticos
 */
function highlightCriticalVitals() {
    const v = GameState.vitals;
    
    // Ejemplos simples de valores críticos
    const critical = {
        TA: v.ta_sistolica < 90 || v.ta_sistolica > 180,
        FC: v.fc < 50 || v.fc > 120,
        FR: v.fr < 10 || v.fr > 30,
        Temp: v.temperatura < 35 || v.temperatura > 39,
        SatO2: v.sato2 < 92
    };
    
    // Añadir clase de alerta si es crítico
    Object.entries(critical).forEach(([key, isCritical]) => {
        const element = document.getElementById(`vital-${key.toLowerCase() === 'ta' ? 'ta' : key.toLowerCase()}`);
        if (element) {
            element.parentElement.style.borderColor = isCritical ? 'var(--danger)' : 'transparent';
            element.parentElement.style.borderWidth = isCritical ? '2px' : '0';
        }
    });
}

/**
 * Actualiza el display de tiempo simulado
 */
function updateTimeDisplay() {
    uiElements.simTime.textContent = GameState.getFormattedTime();
}

/**
 * Selecciona un tipo de acción clínica
 */
function selectAction(actionType) {
    if (isWaitingForAPI) return;
    
    currentActionType = actionType;
    
    // Configurar label según acción
    const labels = {
        anamnesis: 'Pregunta al paciente:',
        examenFisico: 'Describe la maniobra o exploración:',
        estudios: 'Especifica los estudios a solicitar:',
        intervencion: 'Describe la intervención terapéutica:'
    };
    
    uiElements.inputLabel.textContent = labels[actionType];
    uiElements.userInput.placeholder = getPlaceholder(actionType);
    uiElements.inputArea.classList.remove('hidden');
    uiElements.userInput.focus();
}

/**
 * Obtiene placeholder según el tipo de acción
 */
function getPlaceholder(actionType) {
    const placeholders = {
        anamnesis: 'Ej: ¿Desde cuándo tiene estos síntomas? ¿Hay algo que los mejore o empeore?',
        examenFisico: 'Ej: Auscultación pulmonar, palpación abdominal, inspección de extremidades...',
        estudios: 'Ej: Hemograma completo, radiografía de tórax, ECG, glucemia...',
        intervencion: 'Ej: O2 por puntas nasales 2 L/min, ketorolaco 10 mg IV, suero salino 500 mL...'
    };
    return placeholders[actionType] || '';
}

/**
 * Cancela la acción actual
 */
function cancelAction() {
    currentActionType = null;
    uiElements.inputArea.classList.add('hidden');
    uiElements.userInput.value = '';
}

/**
 * Envía la acción seleccionada a la LLM
 */
async function sendAction() {
    const userInput = uiElements.userInput.value.trim();
    
    if (!userInput) {
        alert('❌ Escribe una pregunta o indicación');
        return;
    }
    
    if (isWaitingForAPI) return;
    
    // Ocultar área de input
    uiElements.inputArea.classList.add('hidden');
    
    // Registrar acción
    addLogEntry('user', userInput);
    GameState.logAction(currentActionType, userInput);
    
    // Limpiar input
    uiElements.userInput.value = '';
    
    // Procesar según tipo de acción
    setLoading(true);
    isWaitingForAPI = true;
    
    try {
        let response;
        
        if (currentActionType === 'anamnesis') {
            // Respuesta del paciente
            response = await getPatientResponse(userInput, GameState.hiddenContext);
            
            // Mostrar respuesta formateada
            uiElements.resultsContent.innerHTML = `
                <div class="patient-response">
                    <p><strong>Paciente responde:</strong></p>
                    <p>"${response.respuesta}"</p>
                    ${response.nivel_dolor > 0 ? `<p class="pain-indicator">😣 Nivel de dolor reportado: ${response.nivel_dolor}/10</p>` : ''}
                    ${response.signos_visibles && response.signos_visibles.length > 0 ? 
                        `<p class="visible-signs"><em>Signos observables: ${response.signos_visibles.join(', ')}</em></p>` : ''}
                </div>
            `;
            
            GameState.logInteraction('ai', response.respuesta);
            
        } else if (currentActionType === 'intervencion') {
            // Intervención terapéutica - usar motor clínico
            response = await processClinicalAction(
                'Intervención terapéutica',
                userInput,
                GameState.hiddenContext,
                GameState.vitals
            );
            
            // Actualizar signos vitales si hay cambios
            if (response.signos_vitales) {
                GameState.updateVitals(response.signos_vitales);
                updateVitalsDisplay();
            }
            
            // Actualizar tiempo
            if (response.tiempo_transcurrido_min) {
                GameState.addTime(response.tiempo_transcurrido_min);
                updateTimeDisplay();
            }
            
            // Mostrar resultados de la intervención
            uiElements.resultsContent.innerHTML = formatInterventionResults(response);
            
            GameState.logInteraction('ai', JSON.stringify(response));
            
            // Mostrar alertas si las hay
            if (response.alertas && response.alertas.length > 0) {
                showAlerts(response.alertas);
            }
            
        } else {
            // Examen físico o estudios - usar motor clínico
            const actionLabels = {
                examenFisico: 'Examen físico',
                estudios: 'Estudios solicitados'
            };
            
            response = await processClinicalAction(
                actionLabels[currentActionType],
                userInput,
                GameState.hiddenContext,
                GameState.vitals
            );
            
            // Actualizar signos vitales si hay cambios
            if (response.signos_vitales) {
                GameState.updateVitals(response.signos_vitales);
                updateVitalsDisplay();
            }
            
            // Actualizar tiempo
            if (response.tiempo_transcurrido_min) {
                GameState.addTime(response.tiempo_transcurrido_min);
                updateTimeDisplay();
            }
            
            // Mostrar resultados
            uiElements.resultsContent.innerHTML = formatClinicalResults(response);
            
            GameState.logInteraction('ai', JSON.stringify(response));
            
            // Mostrar alertas si las hay
            if (response.alertas && response.alertas.length > 0) {
                showAlerts(response.alertas);
            }
        }
        
        // Registrar en log
        const entryType = currentActionType === 'anamnesis' ? 'ai' : 'ai';
        addLogEntry(entryType, `Respuesta recibida`);
        
    } catch (error) {
        console.error('Error en acción clínica:', error);
        uiElements.resultsContent.innerHTML = `
            <div class="error-message">
                <p>❌ Error al procesar la acción: ${error.message}</p>
                <p class="retry-hint">Intenta nuevamente o verifica tu conexión.</p>
            </div>
        `;
    } finally {
        setLoading(false);
        isWaitingForAPI = false;
        currentActionType = null;
    }
}

/**
 * Formatea los resultados clínicos para mostrar
 */
function formatClinicalResults(response) {
    let html = '<div class="clinical-results">';
    
    // Hallazgos principales (sanitizados)
    if (response.hallazgos || response.observaciones) {
        const hallazgosSanitizados = sanitizarResultados(
            response.hallazgos || response.observaciones,
            GameState.pathology,
            GameState.hiddenContext?.diagnostico_principal
        );
        html += '<h4>Hallazgos:</h4>';
        html += `<p>${hallazgosSanitizados}</p>`;
    }
    
    // Resultados de estudios
    const estudiosData = response.resultados || response.resultados_estudios;
    if (estudiosData && typeof estudiosData === 'object' && Object.keys(estudiosData).length > 0) {
        html += '<h4>Resultados de estudios:</h4>';
        html += '<ul class="study-results-list">';
        for (const [estudio, resultado] of Object.entries(estudiosData)) {
            // Sanitizar cada resultado individual
            const resultadoSanitizado = sanitizarResultados(
                resultado,
                GameState.pathology,
                GameState.hiddenContext?.diagnostico_principal
            );
            html += `<li><strong>${estudio}:</strong> ${resultadoSanitizado}</li>`;
        }
        html += '</ul>';
    }
    
    // Cambio de estado
    if (response.cambio_estado) {
        const stateColors = {
            mejora: 'success',
            estable: 'system',
            deteriora: 'warning',
            complicacion: 'danger'
        };
        const stateText = {
            mejora: '🟢 El paciente mejora',
            estable: '🔵 El paciente estable',
            deteriora: '🟡 El paciente deteriora',
            complicacion: '🔴 ¡Complicación!'
        };
        html += `<p class="state-change ${stateColors[response.cambio_estado]}">${stateText[response.cambio_estado]}</p>`;
    }
    
    html += '</div>';
    return html;
}

/**
 * Formatea los resultados de intervenciones terapéuticas
 */
function formatInterventionResults(response) {
    let html = '<div class="clinical-results">';
    
    // Hallazgos/respuesta a la intervención
    if (response.hallazgos || response.observaciones) {
        const hallazgosSanitizados = sanitizarResultados(
            response.hallazgos || response.observaciones,
            GameState.pathology,
            GameState.hiddenContext?.diagnostico_principal
        );
        html += '<h4>Respuesta del paciente:</h4>';
        html += `<p>${hallazgosSanitizados}</p>`;
    }
    
    // Resultados de estudios si los hay (intervención puede incluir estudios)
    const estudiosData = response.resultados || response.resultados_estudios;
    if (estudiosData && typeof estudiosData === 'object' && Object.keys(estudiosData).length > 0) {
        html += '<h4>Resultados de estudios:</h4>';
        html += '<ul class="study-results-list">';
        for (const [estudio, resultado] of Object.entries(estudiosData)) {
            const resultadoSanitizado = sanitizarResultados(
                resultado,
                GameState.pathology,
                GameState.hiddenContext?.diagnostico_principal
            );
            html += `<li><strong>${estudio}:</strong> ${resultadoSanitizado}</li>`;
        }
        html += '</ul>';
    }
    
    // Cambio de estado
    if (response.cambio_estado) {
        const stateColors = {
            mejora: 'success',
            estable: 'system',
            deteriora: 'warning',
            complicacion: 'danger'
        };
        const stateText = {
            mejora: '🟢 El paciente mejora tras la intervención',
            estable: '🔵 El paciente estable, sin cambio significativo',
            deteriora: '🟡 El paciente deteriora tras la intervención',
            complicacion: '🔴 ¡Complicación tras la intervención!'
        };
        html += `<p class="state-change ${stateColors[response.cambio_estado]}">${stateText[response.cambio_estado]}</p>`;
    }
    
    html += '</div>';
    return html;
}

/**
 * SANITIZER: Elimina spoilers de diagnósticos en textos del motor clínico
 * @param {string} texto - Texto a sanitizar
 * @param {string} patologia - Patología solicitada por el usuario
 * @param {string} diagnosticoOculto - Diagnóstico oculto generado
 * @returns {string} Texto limpio sin revelaciones del diagnóstico
 */
function sanitizarResultados(texto, patologia, diagnosticoOculto) {
    if (!texto || typeof texto !== 'string') return texto || '';
    
    // Palabras/frases prohibidas que revelan diagnóstico o dan feedback educativo indebido
    const frasesProhibidas = [
        'no indicadas', 'contraindicada', 'no aporta valor', 'no aporta valor diagnóstico',
        'retrasa el manejo', 'no se ha prescrito', 'hallazgos compatibles con',
        'sugiere', 'compatible con', 'orientativo de', 'consistente con',
        'patognomónico', 'típico de', 'característico de', 'propio de',
        'debe considerar', 'se recomienda', 'lo ideal sería', 'hubiera sido mejor',
        'solicitar prueba', 'iniciar tratamiento', 'sugestivos de', 'sugerente de'
    ];
    
    // Construir lista de términos a eliminar (patología + diagnóstico + palabras clave)
    let terminosAEliminar = [];
    
    // Añadir patología solicitada (dividir en palabras clave)
    if (patologia) {
        terminosAEliminar.push(patologia.toLowerCase());
        // Extraer palabras individuales significativas (>3 letras)
        const palabrasPatologia = patologia.toLowerCase().split(/\s+/);
        palabrasPatologia.forEach(p => {
            if (p.length > 3 && !['con', 'del', 'los', 'las', 'una', 'por', 'para'].includes(p)) {
                terminosAEliminar.push(p);
            }
        });
    }
    
    // Añadir diagnóstico oculto
    if (diagnosticoOculto) {
        terminosAEliminar.push(diagnosticoOculto.toLowerCase());
        const palabrasDiag = diagnosticoOculto.toLowerCase().split(/\s+/);
        palabrasDiag.forEach(p => {
            if (p.length > 3 && !['con', 'del', 'los', 'las', 'una', 'por', 'para'].includes(p)) {
                terminosAEliminar.push(p);
            }
        });
    }
    
    // Añadir frases prohibidas
    frasesProhibidas.forEach(frase => terminosAEliminar.push(frase.toLowerCase()));
    
    // Dividir texto en oraciones
    const oraciones = texto.match(/[^.!?]+[.!?]+/g) || [texto];
    
    // Filtrar oraciones que contengan términos prohibidos
    const oracionesLimpias = oraciones.filter(oracion => {
        const oracionLower = oracion.toLowerCase();
        // Verificar si contiene algún término prohibido
        return !terminosAEliminar.some(termino => 
            termino && oracionLower.includes(termino.toLowerCase())
        );
    });
    
    // Unir oraciones restantes
    let resultado = oracionesLimpias.join(' ').trim();
    
    // Si se eliminó todo, devolver mensaje genérico
    if (!resultado) {
        return 'Hallazgos registrados.';
    }
    
    return resultado;
}

/**
 * Muestra alertas clínicas (sanitizadas)
 */
function showAlerts(alerts) {
    alerts.forEach(alert => {
        // Sanitizar alerta antes de mostrar
        const alertSanitizada = sanitizarResultados(
            alert,
            GameState.pathology,
            GameState.hiddenContext?.diagnostico_principal
        );
        if (alertSanitizada) {
            addLogEntry('system', `⚠️ ALERTA: ${alertSanitizada}`, true);
        }
    });
}

/**
 * Añade entrada al log de interacciones
 */
function addLogEntry(type, content, isImportant = false) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}${isImportant ? ' important' : ''}`;
    
    const timestamp = GameState.getFormattedTime();
    const icons = {
        system: '⚙️',
        user: '👤',
        ai: '🤖'
    };
    
    entry.innerHTML = `<small>[${timestamp}]</small> ${icons[type] || ''} ${content}`;
    uiElements.interactionLog.appendChild(entry);
    uiElements.interactionLog.scrollTop = uiElements.interactionLog.scrollHeight;
}

/**
 * Establece estado de carga
 */
function setLoading(loading) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = loading;
        if (loading) btn.classList.add('disabled');
        else btn.classList.remove('disabled');
    });
    
    if (loading) {
        uiElements.resultsContent.innerHTML = `
            <div class="loading-spinner">
                <p>⏳ Procesando... La IA está generando la respuesta</p>
            </div>
        `;
    }
}

/**
 * Muestra la evaluación formateada
 */
function displayEvaluation(evaluation) {
    let html = '';
    
    // Puntajes
    if (evaluation.puntajes) {
        html += '<h3>📊 Puntajes por Competencia</h3>';
        html += '<div class="score-grid">';
        
        const competencias = {
            anamnesis: 'Anamnesis',
            examen_fisico: 'Examen Físico',
            estudios_solicitados: 'Estudios',
            diagnostico: 'Diagnóstico',
            tratamiento: 'Tratamiento',
            promedio: 'Promedio'
        };
        
        for (const [key, label] of Object.entries(competencias)) {
            const score = evaluation.puntajes[key] || 0;
            const colorClass = score >= 8 ? 'success' : score >= 6 ? 'warning' : 'danger';
            html += `
                <div class="score-item">
                    <div class="score-value ${colorClass}">${score}/10</div>
                    <div class="score-label">${label}</div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    // Aciertos
    if (evaluation.aciertos && evaluation.aciertos.length > 0) {
        html += '<div class="evaluation-section">';
        html += '<h4>✅ Aciertos</h4>';
        html += '<ul class="study-results-list">';
        evaluation.aciertos.forEach(acierto => {
            html += `<li>${acierto}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Errores y omisiones
    if (evaluation.errores_omisiones && evaluation.errores_omisiones.length > 0) {
        html += '<div class="evaluation-section">';
        html += '<h4>⚠️ Errores y Omisiones</h4>';
        html += '<ul class="study-results-list">';
        evaluation.errores_omisiones.forEach(error => {
            html += `<li>${error}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Comparación con guías
    if (evaluation.comparacion_guias) {
        html += '<div class="evaluation-section">';
        html += '<h4>📚 Comparación con Guías Clínicas</h4>';
        html += `<p><strong>Guías aplicables:</strong> ${evaluation.comparacion_guias.guias_aplicables.join(', ')}</p>`;
        html += `<p><strong>Cumplimiento:</strong> ${evaluation.comparacion_guias.cumplimiento.toUpperCase()}</p>`;
        
        if (evaluation.comparacion_guias.desviaciones && evaluation.comparacion_guias.desviaciones.length > 0) {
            html += '<p><strong>Desviaciones:</strong></p><ul class="study-results-list">';
            evaluation.comparacion_guias.desviaciones.forEach(dev => {
                html += `<li>${dev}</li>`;
            });
            html += '</ul>';
        }
        html += '</div>';
    }
    
    // Tratamiento óptimo
    if (evaluation.tratamiento_optimo) {
        html += '<div class="evaluation-section">';
        html += '<h4>💊 Tratamiento Óptimo Según Guías</h4>';
        
        if (evaluation.tratamiento_optimo.farmacologico) {
            html += '<p><strong>Farmacológico:</strong></p><ul class="study-results-list">';
            evaluation.tratamiento_optimo.farmacologico.forEach(tx => {
                html += `<li>${tx}</li>`;
            });
            html += '</ul>';
        }
        
        if (evaluation.tratamiento_optimo.no_farmacologico) {
            html += '<p><strong>No farmacológico:</strong></p><ul class="study-results-list">';
            evaluation.tratamiento_optimo.no_farmacologico.forEach(tx => {
                html += `<li>${tx}</li>`;
            });
            html += '</ul>';
        }
        
        if (evaluation.tratamiento_optimo.seguimiento) {
            html += '<p><strong>Seguimiento:</strong></p><ul class="study-results-list">';
            evaluation.tratamiento_optimo.seguimiento.forEach(tx => {
                html += `<li>${tx}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</div>';
    }
    
    // Recomendaciones de estudio
    if (evaluation.recomendaciones_estudio && evaluation.recomendaciones_estudio.length > 0) {
        html += '<div class="evaluation-section">';
        html += '<h4>📖 Recomendaciones de Estudio</h4>';
        html += '<ul class="study-results-list">';
        evaluation.recomendaciones_estudio.forEach(rec => {
            html += `<li>${rec}</li>`;
        });
        html += '</ul></div>';
    }
    
    // Comentario general
    if (evaluation.comentario_general) {
        html += '<div class="evaluation-section">';
        html += '<h4>💬 Comentario del Tutor</h4>';
        html += `<p>${evaluation.comentario_general}</p></div>`;
    }
    
    uiElements.evaluationContent.innerHTML = html;
}

/**
 * Función para cerrar el caso y generar evaluación
 * Lee los cuadernos de DX y TX, valida y llama a generateEvaluation
 */
function cerrarCaso() {
    const dxText = document.getElementById('notebook-diagnosis').value.trim();
    const txText = document.getElementById('notebook-treatment').value.trim();
    
    // Validar que ambos campos tengan contenido
    if (!dxText || !txText) {
        const errorDiv = document.getElementById('close-case-error');
        if (errorDiv) {
            errorDiv.textContent = '⚠️ Por favor completa ambos cuadernos (Diagnóstico y Tratamiento) antes de cerrar el caso.';
            errorDiv.style.display = 'block';
            errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Si no existe el div de error, crearlo temporalmente
            const tempError = document.createElement('div');
            tempError.id = 'close-case-error';
            tempError.className = 'alert alert-warning';
            tempError.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 1rem; margin: 1rem 0; border-radius: 4px;';
            tempError.textContent = '⚠️ Por favor completa ambos cuadernos (Diagnóstico y Tratamiento) antes de cerrar el caso.';
            document.querySelector('.case-footer').insertAdjacentElement('beforebegin', tempError);
            setTimeout(() => tempError.remove(), 5000);
        }
        return;
    }
    
    // Limpiar cualquier mensaje de error previo
    const errorDiv = document.getElementById('close-case-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    // Mostrar indicador de carga del tutor
    uiElements.resultsContent.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p><strong>👨‍🏫 El tutor está evaluando tu caso...</strong></p>
            <p class="loading-subtext">Esto puede tardar unos segundos mientras se genera el informe completo.</p>
        </div>
    `;
    
    // Generar evaluación con los contenidos de los cuadernos
    generateEvaluation(dxText, txText);
}

/**
 * Reinicia la aplicación a la pantalla de inicio
 */
function resetToHome() {
    GameState.reset();
    uiElements.interactionLog.innerHTML = '<div class="log-entry system">Caso iniciado. Comienza la evaluación del paciente.</div>';
    uiElements.resultsContent.innerHTML = '<p class="placeholder-text">Los resultados aparecerán aquí...</p>';
    showScreen('home');
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initApp);
