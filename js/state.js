/**
 * SimClinico - Gestión del Estado Clínico
 * Maneja el estado del paciente, tiempo simulado e historial de acciones
 */

const GameState = {
    // Información del paciente
    patient: null,
    
    // Signos vitales actuales
    vitals: {
        ta_sistolica: 0,
        ta_diastolica: 0,
        fc: 0,
        fr: 0,
        temperatura: 0,
        sato2: 0
    },
    
    // Tiempo simulado en minutos
    simulatedTime: 0,
    
    // Estado clínico actual
    clinicalState: 'stable', // stable, improving, worsening, critical
    
    // Historial de interacciones
    interactionHistory: [],
    
    // Acciones realizadas por categoría
    actionsPerformed: {
        anamnesis: [],
        examenFisico: [],
        estudios: []
    },
    
    // Diagnóstico y tratamiento propuestos por el usuario
    userDiagnosis: null,
    userTreatment: null,
    
    // Configuración del caso
    difficulty: 'internado',
    pathology: '',
    
    /**
     * Inicializa un nuevo caso clínico
     */
    initNewCase(pathology, difficulty) {
        this.pathology = pathology;
        this.difficulty = difficulty;
        this.simulatedTime = 0;
        this.clinicalState = 'stable';
        this.interactionHistory = [];
        this.actionsPerformed = {
            anamnesis: [],
            examenFisico: [],
            estudios: []
        };
        this.userDiagnosis = null;
        this.userTreatment = null;
    },
    
    /**
     * Actualiza los signos vitales del paciente
     */
    updateVitals(newVitals) {
        if (newVitals.ta_sistolica) this.vitals.ta_sistolica = newVitals.ta_sistolica;
        if (newVitals.ta_diastolica) this.vitals.ta_diastolica = newVitals.ta_diastolica;
        if (newVitals.fc) this.vitals.fc = newVitals.fc;
        if (newVitals.fr) this.vitals.fr = newVitals.fr;
        if (newVitals.temperatura) this.vitals.temperatura = newVitals.temperatura;
        if (newVitals.sato2) this.vitals.sato2 = newVitals.sato2;
    },
    
    /**
     * Añade tiempo simulado
     */
    addTime(minutes) {
        this.simulatedTime += minutes;
    },
    
    /**
     * Registra una interacción en el historial
     */
    logInteraction(type, content, response = null) {
        const entry = {
            timestamp: this.simulatedTime,
            type: type, // 'user', 'ai', 'system'
            content: content,
            response: response,
            category: null // 'anamnesis', 'examen', 'estudios'
        };
        this.interactionHistory.push(entry);
    },
    
    /**
     * Registra una acción clínica realizada
     */
    logAction(category, action) {
        if (this.actionsPerformed[category]) {
            this.actionsPerformed[category].push({
                action: action,
                timestamp: this.simulatedTime
            });
        }
    },
    
    /**
     * Obtiene el formato legible del tiempo simulado
     */
    getFormattedTime() {
        const hours = Math.floor(this.simulatedTime / 60);
        const minutes = this.simulatedTime % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes} min`;
    },
    
    /**
     * Obtiene resumen de acciones para evaluación
     */
    getActionsSummary() {
        return {
            anamnesis: this.actionsPerformed.anamnesis.map(a => a.action),
            examenFisico: this.actionsPerformed.examenFisico.map(a => a.action),
            estudios: this.actionsPerformed.estudios.map(a => a.action),
            totalInteractions: this.interactionHistory.length,
            diagnosis: this.userDiagnosis,
            treatment: this.userTreatment
        };
    },
    
    /**
     * Reinicia el estado para un nuevo caso
     */
    reset() {
        this.patient = null;
        this.vitals = {
            ta_sistolica: 0,
            ta_diastolica: 0,
            fc: 0,
            fr: 0,
            temperatura: 0,
            sato2: 0
        };
        this.initNewCase('', 'internado');
    }
};

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameState;
}
