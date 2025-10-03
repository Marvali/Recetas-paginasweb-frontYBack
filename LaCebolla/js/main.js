document.addEventListener('DOMContentLoaded', () => {
  const timeElement = document.getElementById('current-time');

  if (!timeElement) {
    return;
  }

  const formatTime = (date) => {
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/^./, (char) => char.toUpperCase());
  };

  const updateTime = () => {
    const now = new Date();
    timeElement.textContent = formatTime(now);
  };

  updateTime();
  setInterval(updateTime, 1000 * 60);
});
