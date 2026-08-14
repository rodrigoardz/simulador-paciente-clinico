# 🏥 SimClinico – Simulador de Paciente Virtual

**Herramienta educativa para estudiantes de medicina**

---

## 📖 Descripción

SimClinico es una aplicación web que utiliza inteligencia artificial (Qwen, via DashScope API) para simular pacientes virtuales con patologías específicas. Los estudiantes pueden:

1. **Introducir una patología** (ej: "neumonía adquirida en la comunidad", "cetoacidosis diabética")
2. **Seleccionar nivel de dificultad** (Internado / Residente / Adjunto)
3. **Realizar el proceso clínico completo**:
   - Anamnesis (preguntar al paciente)
   - Examen físico (explorar por aparatos)
   - Solicitar estudios (laboratorio, imagen, ECG, etc.)
4. **Cerrar el caso** con diagnóstico y tratamiento
5. **Recibir evaluación** basada en guías clínicas vigentes

---

## 🚀 Cómo Ejecutar

### Opción 1: Abrir directamente en el navegador

1. Descarga o clona este repositorio
2. Abre el archivo `index.html` en tu navegador (Chrome, Firefox, Edge, etc.)
3. Configura tu API key en el botón ⚙️ Configuración
4. ¡Comienza a simular!

### Opción 2: Usar un servidor local (recomendado)

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Luego abre `http://localhost:8000` en tu navegador.

### Opción 3: Desplegar en GitHub Pages

1. Sube el código a un repositorio de GitHub
2. Ve a Settings → Pages
3. Selecciona la rama `main` y guarda
4. Tu app estará disponible en `https://tu-usuario.github.io/tu-repo/`

---

## 🔑 Configurar API Key

SimClinico utiliza la API de **Qwen (DashScope)** de Alibaba Cloud.

### Obtener tu API Key:

1. Regístrate en [Alibaba Cloud DashScope](https://dashscope.console.aliyun.com/)
2. Crea una API Key en la consola
3. Copia la clave (comienza con `sk-`)

### Configurar en SimClinico:

1. Haz clic en ⚙️ **Configuración** (esquina superior derecha)
2. Pega tu API key en el campo correspondiente
3. Haz clic en **Guardar**

La clave se almacena **localmente en tu navegador** (localStorage) y nunca se envía a ningún servidor excepto a la API oficial de DashScope.

---

## 📁 Estructura de Archivos

```
simclinico/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos (modo oscuro, responsive)
├── js/
│   ├── app.js          # Lógica de UI y flujo principal
│   ├── api.js          # Llamadas a la API de Qwen
│   ├── prompts.js      # System prompts para los 3 roles de la LLM
│   └── state.js        # Gestión del estado clínico
└── README.md           # Este archivo
```

---

## 🎯 Flujo de Uso

### 1. Pantalla de Inicio
- Introduce la patología a simular
- Selecciona el nivel de dificultad
- Haz clic en "Iniciar simulación"

### 2. Generación del Caso
- La IA genera un paciente con nombre, edad, sexo
- Muestra motivo de consulta y signos vitales iniciales
- El cuadro clínico real está oculto (solo la IA lo conoce)

### 3. Bucle Clínico por Turnos
En cada turno puedes:

**💬 Anamnesis**
- Escribe preguntas como en una consulta real
- El paciente responde en primera persona
- No revela el diagnóstico directamente

**🩺 Examen Físico**
- Describe la maniobra o exploración
- Recibe hallazgos coherentes con la patología
- Los signos vitales pueden actualizarse

**🔬 Solicitar Estudios**
- Pide laboratorio, imagen, ECG, etc.
- Recibe resultados fisiopatológicamente correctos
- Cada acción consume tiempo simulado

### 4. Cerrar Caso
- Escribe tu diagnóstico definitivo
- Propón un plan de tratamiento
- Confirma para recibir evaluación

### 5. Evaluación
La IA (en rol de tutor) genera un reporte con:
- **Puntajes por competencia** (0-10)
- **Aciertos** identificados
- **Errores y omisiones**
- **Comparación con guías clínicas** (ADA, AHA, ESC, GOLD, etc.)
- **Tratamiento óptimo** según evidencia
- **Recomendaciones de estudio** personalizadas

---

## 🧠 Roles de la IA

La aplicación utiliza 3 system prompts diferentes:

| Rol | Función | Formato de Salida |
|-----|---------|-------------------|
| **Paciente Simulado** | Responde como paciente real en primera persona | JSON con respuesta, nivel de dolor, signos visibles |
| **Motor Clínico** | Genera casos y gestiona evolución | JSON con signos vitales, cambios de estado, tiempo |
| **Tutor/Evaluador** | Evalúa desempeño basado en guías | JSON con puntajes, aciertos, errores, recomendaciones |

**Importante:** Todas las respuestas deben ser JSON estrictamente válido para que la app pueda parsearlas.

---

## ⚠️ Disclaimer

> **Herramienta educativa:** SimClinico es un simulador diseñado para fines educativos. **NO sustituye** el juicio clínico profesional, las guías oficiales ni la supervisión médica adecuada. Los casos generados son simulaciones y pueden no reflejar exactamente la realidad clínica.

---

## 🛠️ Requisitos Técnicos

- Navegador moderno (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Conexión a internet (para llamar a la API de Qwen)
- API key válida de DashScope (Qwen)
- JavaScript habilitado

---

## 🎨 Características

- ✅ **Modo oscuro** por defecto (descanso visual)
- ✅ **Diseño responsive** (funciona en móvil, tablet, desktop)
- ✅ **Interfaz 100% en español**
- ✅ **Código comentado** y modular
- ✅ **Manejo de errores** con mensajes claros
- ✅ **Sin frameworks** (vanilla JS, fácil de mantener)
- ✅ **Desplegable en GitHub Pages**

---

## 📝 Ejemplos de Patologías a Simular

- Neumonía adquirida en la comunidad
- Cetoacidosis diabética
- Infarto agudo de miocardio
- Accidente cerebrovascular isquémico
- Apendicitis aguda
- Crisis asmática
- Sepsis de origen urinario
- Hemorragia digestiva alta
- Insuficiencia cardíaca descompensada
- Meningitis bacteriana

---

## 🔧 Solución de Problemas

### "API key inválida"
- Verifica que copiaste correctamente la clave
- Asegúrate de que no tenga espacios al inicio/final
- Revisa que tu cuenta de DashScope tenga saldo/credito

### "Error al generar caso"
- Verifica tu conexión a internet
- Intenta con otra patología (algunas muy raras pueden fallar)
- Espera unos segundos y reintenta (rate limiting)

### "No se pudo parsear la respuesta JSON"
- Es un error temporal de la IA
- Recarga la página e intenta nuevamente
- Reporta el problema si persiste

---

## 📄 Licencia

Este proyecto es de código abierto para fines educativos.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para reportar bugs o sugerencias, abre un issue en el repositorio.

---

**Desarrollado con ❤️ para la educación médica**

*Última actualización: 2024*
