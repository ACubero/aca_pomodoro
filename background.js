chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'timerComplete') {
      // Crear notificación
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: request.type === 'pomodoro' ? '¡Pomodoro Completado!' : '¡Descanso Completado!',
        message: request.type === 'pomodoro' ? 'Es hora de tomar un descanso.' : 'Es hora de volver a trabajar.',
        priority: 2
      });
    }
  });
  
  // Inicializar el ícono si aún no existe
  chrome.runtime.onInstalled.addListener(function() {
    console.log('Pomodoro Timer instalado.');
  });