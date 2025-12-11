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
    console.log('Cargando conversaciones...');
    const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
      headers: getAuthHeaders()
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(errorData.detail || 'Error al cargar conversaciones');
    }

    const data = await response.json();
    console.log('Conversaciones recibidas:', data);
    displayConversations(data.conversations || []);
  } catch (error) {
    console.error('Error al cargar conversaciones:', error);
    container.innerHTML = `<div class="card"><p>Error al cargar conversaciones: ${error.message}</p></div>`;
  }
};

const displayConversations = (conversations) => {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  if (conversations.length === 0) {
    container.innerHTML = '<p>No tienes conversaciones aún.</p>';
    // Mostrar sección para iniciar conversación con amigos
    loadFriendsForMessaging();
    return;
  }

  // Ocultar sección de iniciar conversación si hay conversaciones
  const startSection = document.getElementById('start-conversation-section');
  if (startSection) {
    startSection.style.display = 'none';
  }

  container.innerHTML = `
    ${conversations.map(conv => {
      const lastMsg = conv.last_message || {};
      const msgContent = lastMsg.content || '';
      const truncatedContent = msgContent.length > 50 ? msgContent.substring(0, 50) + '...' : msgContent;
      
      return `
        <a href="mensajes.html?user=${conv.user.id}" class="card" style="display: block; text-decoration: none; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            ${conv.user.profile_image_url ? 
              `<img src="${escapeHtml(conv.user.profile_image_url)}" alt="${escapeHtml(conv.user.username)}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : 
              `<div style="width: 50px; height: 50px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; font-weight: bold;">${escapeHtml(conv.user.username.charAt(0).toUpperCase())}</div>`
            }
            <div style="flex: 1;">
              <h3 style="margin: 0 0 0.5rem 0;">${escapeHtml(conv.user.username)}</h3>
              <p style="margin: 0; color: #666; font-size: 0.9rem;">${escapeHtml(truncatedContent)}</p>
            </div>
            ${conv.unread_count > 0 ? `<span style="background: #e74c3c; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${conv.unread_count}</span>` : ''}
          </div>
        </a>
      `;
    }).join('')}
  `;
};

// Cargar conversación específica
const loadConversation = async (otherUserId) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  try {
    console.log(`Cargando conversación con usuario ${otherUserId}...`);
    const url = `${API_BASE_URL}/messages/conversation/${otherUserId}`;
    console.log('URL:', url);
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText || 'Error al cargar mensajes' };
      }
      throw new Error(errorData.detail || 'Error al cargar mensajes');
    }

    const data = await response.json();
    console.log('Datos recibidos:', data);
    
    // Mostrar información del otro usuario
    if (data.other_user) {
      displayConversationHeader(data.other_user);
    }
    
    // Mostrar mensajes (puede estar vacío si es la primera conversación)
    displayMessages(data.messages || []);
    
    // Scroll al final
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  } catch (error) {
    console.error('Error al cargar conversación:', error);
    if (container) {
      container.innerHTML = `<div class="card"><p>Error al cargar mensajes: ${error.message}</p></div>`;
    }
  }
};

// Mostrar header de la conversación con info del usuario
const displayConversationHeader = (otherUser) => {
  const header = document.getElementById('conversation-header');
  const avatarContainer = document.getElementById('other-user-avatar');
  const nameContainer = document.getElementById('other-user-name');
  const bioContainer = document.getElementById('other-user-bio');
  
  if (!header || !avatarContainer || !nameContainer || !bioContainer) return;
  
  // Mostrar header
  header.style.display = 'block';
  
  // Avatar
  if (otherUser.profile_image_url) {
    avatarContainer.innerHTML = `<img src="${escapeHtml(otherUser.profile_image_url)}" alt="${escapeHtml(otherUser.username)}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">`;
  } else {
    avatarContainer.innerHTML = `<div style="width: 60px; height: 60px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.5rem;">${escapeHtml((otherUser.username || 'U').charAt(0).toUpperCase())}</div>`;
  }
  
  // Nombre
  nameContainer.textContent = otherUser.username || 'Usuario';
  
  // Bio
  bioContainer.textContent = otherUser.bio || 'Sin biografía';
};

const displayMessages = (messages) => {
  const container = document.getElementById('messages-container');
  if (!container) return;

  const currentUserId = getUserData().id;
  console.log('Displaying messages:', messages);
  console.log('Current user ID:', currentUserId);

  if (messages.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;"><p>No hay mensajes aún. ¡Envía el primero para iniciar la conversación!</p></div>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isOwn = msg.sender_id === currentUserId;
    const sender = msg.sender || { username: 'Usuario desconocido' };
    const senderName = sender.username || 'Usuario desconocido';
    const content = msg.content || '';
    
    return `
      <div class="card ${isOwn ? 'message-own' : 'message-other'}" style="margin-bottom: 1rem; ${isOwn ? 'margin-left: auto; max-width: 70%;' : 'margin-right: auto; max-width: 70%;'}">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong>${escapeHtml(senderName)}</strong>
          <span style="color: #666; font-size: 0.85rem;">${formatDate(msg.created_at)}</span>
        </div>
        <p style="margin: 0;">${escapeHtml(content)}</p>
      </div>
    `;
  }).join('');
};

// Enviar mensaje
const setupMessageForm = (otherUserId) => {
  const form = document.getElementById('send-message-form');
  if (!form) {
    console.error('Formulario de envío no encontrado');
    return;
  }

  // Remover listeners previos si existen
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const input = newForm.querySelector('textarea[name="content"]');
    const content = input.value.trim();

    if (!content) {
      alert('Por favor, escribe un mensaje');
      return;
    }

    // Deshabilitar el formulario mientras se envía
    const submitButton = newForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    try {
      console.log('Enviando mensaje a usuario:', otherUserId);
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiver_id: parseInt(otherUserId),
          content: content
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al enviar mensaje');
      }

      const result = await response.json();
      console.log('Mensaje enviado:', result);

      // Limpiar el input
      input.value = '';
      
      // Recargar la conversación para mostrar el nuevo mensaje
      await loadConversation(otherUserId);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      alert(error.message || 'Error al enviar mensaje. Por favor, intenta de nuevo.');
    } finally {
      // Rehabilitar el formulario
      submitButton.disabled = false;
      submitButton.textContent = originalText;
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

// Cargar amigos para iniciar conversación
const loadFriendsForMessaging = async () => {
  const container = document.getElementById('friends-to-message-list');
  const section = document.getElementById('start-conversation-section');
  
  if (!container || !section) return;

  try {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      section.style.display = 'none';
      return;
    }

    const data = await response.json();
    const friends = data.friends || [];

    if (friends.length === 0) {
      section.style.display = 'none';
      return;
    }

    // Mostrar sección
    section.style.display = 'block';
    
    // Mostrar lista de amigos
    container.innerHTML = friends.map(friend => `
      <div class="card" style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem; flex: 1;">
            ${friend.profile_image_url ? 
              `<img src="${escapeHtml(friend.profile_image_url)}" alt="${escapeHtml(friend.username)}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` : 
              `<div style="width: 50px; height: 50px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; font-weight: bold;">${escapeHtml(friend.username.charAt(0).toUpperCase())}</div>`
            }
            <div>
              <h3 style="margin: 0 0 0.25rem 0;">${escapeHtml(friend.username)}</h3>
              <p style="margin: 0; color: #666; font-size: 0.9rem;">${escapeHtml(friend.bio || 'Sin biografía')}</p>
            </div>
          </div>
          <a href="mensajes.html?user=${friend.id}" class="button button--primary">
            Enviar mensaje
          </a>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error al cargar amigos:', error);
    section.style.display = 'none';
  }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  const otherUserId = getOtherUserId();
  
  if (otherUserId) {
    // Vista de conversación específica
    // Ocultar secciones de lista
    const conversationsList = document.getElementById('conversations-list');
    const startSection = document.getElementById('start-conversation-section');
    if (conversationsList) conversationsList.style.display = 'none';
    if (startSection) startSection.style.display = 'none';
    
    // Mostrar vista de conversación
    const conversationView = document.getElementById('conversation-view');
    if (conversationView) conversationView.style.display = 'block';
    
    loadConversation(otherUserId);
    setupMessageForm(otherUserId);
    
    // Recargar mensajes cada 5 segundos
    setInterval(() => loadConversation(otherUserId), 5000);
  } else {
    // Vista de lista de conversaciones
    // Ocultar vista de conversación
    const conversationView = document.getElementById('conversation-view');
    if (conversationView) conversationView.style.display = 'none';
    
    loadConversations();
  }
});

