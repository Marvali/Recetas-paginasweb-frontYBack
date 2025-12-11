// mensajes.js - Sistema de mensajería
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getUserEmail = () => localStorage.getItem('userEmail');
const getUserData = () => JSON.parse(localStorage.getItem('userData') || '{}');

const checkAuth = () => {
  const email = getUserEmail();
  if (!email) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-User-Email': getUserEmail()
});

// Obtener ID del usuario con quien chatear desde URL
const getOtherUserId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('user');
};

// Cargar conversaciones
const loadConversations = async () => {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar conversaciones');

    const data = await response.json();
    displayConversations(data.conversations || []);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar conversaciones</p>';
  }
};

const displayConversations = (conversations) => {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  if (conversations.length === 0) {
    container.innerHTML = '<p>No tienes conversaciones aún</p>';
    return;
  }

  container.innerHTML = conversations.map(conv => `
    <a href="mensajes.html?user=${conv.user.id}" class="card">
      <div class="card__header">
        ${conv.user.profile_image_url ? `<img src="${conv.user.profile_image_url}" alt="${conv.user.username}" style="width: 50px; height: 50px; border-radius: 50%;">` : ''}
        <div>
          <h3>${escapeHtml(conv.user.username)}</h3>
          <p class="card__meta">${escapeHtml(conv.last_message.content.substring(0, 50))}...</p>
          ${conv.unread_count > 0 ? `<span class="tag">${conv.unread_count} nuevos</span>` : ''}
        </div>
      </div>
    </a>
  `).join('');
};

// Cargar conversación específica
const loadConversation = async (otherUserId) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/messages/conversation/${otherUserId}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar mensajes');

    const data = await response.json();
    displayMessages(data.messages || []);
    
    // Scroll al final
    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar mensajes</p>';
  }
};

const displayMessages = (messages) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const currentUserId = getUserData().id;

  if (messages.length === 0) {
    container.innerHTML = '<p>No hay mensajes aún. ¡Envía el primero!</p>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isOwn = msg.sender_id === currentUserId;
    return `
      <div class="card ${isOwn ? 'message-own' : 'message-other'}">
        <div class="card__header">
          <strong>${escapeHtml(msg.sender.username)}</strong>
          <span class="card__meta">${formatDate(msg.created_at)}</span>
        </div>
        <p>${escapeHtml(msg.content)}</p>
      </div>
    `;
  }).join('');
};

// Enviar mensaje
const setupMessageForm = (otherUserId) => {
  const form = document.getElementById('send-message-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const input = form.querySelector('textarea[name="content"]');
    const content = input.value.trim();

    if (!content) return;

    try {
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiver_id: parseInt(otherUserId),
          content: content
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al enviar mensaje');
      }

      input.value = '';
      loadConversation(otherUserId);
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  });
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  const otherUserId = getOtherUserId();
  
  if (otherUserId) {
    // Vista de conversación específica
    loadConversation(otherUserId);
    setupMessageForm(otherUserId);
    
    // Recargar mensajes cada 5 segundos
    setInterval(() => loadConversation(otherUserId), 5000);
  } else {
    // Vista de lista de conversaciones
    loadConversations();
  }
});

