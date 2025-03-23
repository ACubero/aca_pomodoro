document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos DOM
  const timerDisplay = document.getElementById('timer');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const sessionsContainer = document.getElementById('sessions');
  const sessionTypeInputs = document.getElementsByName('type');
  
  // Variables para el temporizador
  let timerMinutes = 25;
  let timerSeconds = 0;
  let timerMilliseconds = 0;
  let timerId;
  let isRunning = false;
  let sessionStartTime = null;
  let currentSessionType = 'pomodoro';
  let sessions = [];
  
  // Cargar sesiones anteriores
  chrome.storage.local.get(['pomodoroSessions'], function(result) {
    if (result.pomodoroSessions) {
      sessions = result.pomodoroSessions;
      renderSessions();
    }
  });
  
  // Manejadores de eventos para los botones
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);
  
  // Cambiar tipo de sesión
  for (let input of sessionTypeInputs) {
    input.addEventListener('change', function() {
      if (isRunning) {
        pauseTimer();
      }
      
      currentSessionType = this.value;
      
      if (currentSessionType === 'pomodoro') {
        timerMinutes = 25;
      } else if (currentSessionType === 'shortBreak') {
        timerMinutes = 5;
      } else if (currentSessionType === 'longBreak') {
        timerMinutes = 15;
      }
      
      timerSeconds = 0;
      timerMilliseconds = 0;
      updateDisplay();
    });
  }
  
  // Función para actualizar el display del temporizador
  function updateDisplay() {
    const formattedMinutes = String(timerMinutes).padStart(2, '0');
    const formattedSeconds = String(timerSeconds).padStart(2, '0');
    const formattedMilliseconds = String(Math.floor(timerMilliseconds / 10)).padStart(2, '0');
    
    timerDisplay.textContent = `${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
  }
  
  // Iniciar el temporizador
  function startTimer() {
    if (!isRunning) {
      isRunning = true;
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      
      if (!sessionStartTime) {
        sessionStartTime = new Date();
      }
      
      // Actualizar cada 10ms para mostrar centésimas de segundo
      timerId = setInterval(function() {
        timerMilliseconds -= 10;
        
        if (timerMilliseconds < 0) {
          timerMilliseconds = 990;
          timerSeconds--;
          
          if (timerSeconds < 0) {
            timerSeconds = 59;
            timerMinutes--;
            
            if (timerMinutes < 0) {
              // Tiempo completado
              clearInterval(timerId);
              isRunning = false;
              saveSession(true);
              
              // Notificar al usuario
              chrome.runtime.sendMessage({
                action: 'timerComplete',
                type: currentSessionType
              });
              
              // Preparar para la siguiente sesión
              if (currentSessionType === 'pomodoro') {
                // Cambiar a descanso corto
                for (let input of sessionTypeInputs) {
                  if (input.value === 'shortBreak') {
                    input.checked = true;
                    currentSessionType = 'shortBreak';
                    timerMinutes = 5;
                  }
                }
              } else {
                // Cambiar a pomodoro
                for (let input of sessionTypeInputs) {
                  if (input.value === 'pomodoro') {
                    input.checked = true;
                    currentSessionType = 'pomodoro';
                    timerMinutes = 25;
                  }
                }
              }
              
              timerSeconds = 0;
              timerMilliseconds = 0;
              sessionStartTime = null;
              startBtn.disabled = false;
              pauseBtn.disabled = true;
            }
          }
        }
        
        updateDisplay();
      }, 10);
    }
  }
  
  // Pausar el temporizador
  function pauseTimer() {
    if (isRunning) {
      clearInterval(timerId);
      isRunning = false;
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      saveSession(false);
    }
  }
  
  // Reiniciar el temporizador
  function resetTimer() {
    clearInterval(timerId);
    isRunning = false;
    
    if (sessionStartTime) {
      saveSession(false);
    }
    
    // Reiniciar valores según el tipo de sesión actual
    if (currentSessionType === 'pomodoro') {
      timerMinutes = 25;
    } else if (currentSessionType === 'shortBreak') {
      timerMinutes = 5;
    } else if (currentSessionType === 'longBreak') {
      timerMinutes = 15;
    }
    
    timerSeconds = 0;
    timerMilliseconds = 0;
    sessionStartTime = null;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    
    updateDisplay();
  }
  
  // Guardar sesión
  function saveSession(completed) {
    if (sessionStartTime) {
      const endTime = new Date();
      const duration = (endTime - sessionStartTime) / 1000; // en segundos
      
      const session = {
        type: currentSessionType,
        startTime: sessionStartTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        completed: completed
      };
      
      sessions.unshift(session); // Agregar al inicio para que los más recientes aparezcan primero
      
      // Limitar a 50 sesiones guardadas
      if (sessions.length > 50) {
        sessions = sessions.slice(0, 50);
      }
      
      // Guardar en el almacenamiento local
      chrome.storage.local.set({ 'pomodoroSessions': sessions });
      
      // Actualizar la UI
      renderSessions();
      
      sessionStartTime = null;
    }
  }
  
  // Renderizar lista de sesiones
  function renderSessions() {
    sessionsContainer.innerHTML = '';
    
    sessions.forEach(function(session) {
      const sessionEl = document.createElement('div');
      sessionEl.className = `session ${session.type}`;
      
      const typeLabel = session.type === 'pomodoro' ? 'Pomodoro' : 
                        (session.type === 'shortBreak' ? 'Descanso Corto' : 'Descanso Largo');
      
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      
      // Formatear fecha
      const dateOptions = { month: 'short', day: 'numeric' };
      const timeOptions = { hour: '2-digit', minute: '2-digit' };
      
      const dateStr = start.toLocaleDateString(undefined, dateOptions);
      const startTimeStr = start.toLocaleTimeString(undefined, timeOptions);
      const endTimeStr = end.toLocaleTimeString(undefined, timeOptions);
      
      // Formatear duración
      const minutes = Math.floor(session.duration / 60);
      const seconds = Math.floor(session.duration % 60);
      const durationStr = `${minutes}m ${seconds}s`;
      
      sessionEl.innerHTML = `
        <strong>${typeLabel}</strong> - ${dateStr} (${startTimeStr} - ${endTimeStr})
        <br>Duración: ${durationStr} - ${session.completed ? 'Completado' : 'Interrumpido'}
      `;
      
      sessionsContainer.appendChild(sessionEl);
    });
  }
  
  // Inicializar display
  updateDisplay();
});