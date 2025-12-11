// amigos.js - Sistema de amigos
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getUserEmail = () => localStorage.getItem('userEmail');

const checkAuth = () => {
  const email = getUserEmail();
  if (!email) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

const getAuthHeaders = () => {
  const email = getUserEmail();
  if (!email) {
    console.error('No hay email en localStorage');
    return {};
  }
  return {
    'Content-Type': 'application/json',
    'X-User-Email': email
  };
};

// Buscar usuarios
const setupUserSearch = () => {
  const searchForm = document.getElementById('search-users-form');
  const searchInput = document.getElementById('search-query');
  const resultsContainer = document.getElementById('search-results');

  if (!searchForm || !searchInput || !resultsContainer) return;

  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();

    if (query.length < 1) {
      resultsContainer.innerHTML = '<p>Escribe al menos 1 carácter</p>';
      return;
    }

    try {
      // Mostrar loading
      resultsContainer.innerHTML = '<p>Cargando...</p>';
      
      const authHeaders = getAuthHeaders();
      const email = getUserEmail();
      
      console.log('Email del usuario:', email);
      console.log('Headers de autenticación:', authHeaders);
      
      const url = `${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`;
      console.log('URL de búsqueda:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);
      console.log('Headers de respuesta:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Error al buscar usuarios';
        let errorData = null;
        try {
          errorData = await response.json();
          console.error('Error del servidor (JSON):', errorData);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          const textError = await response.text();
          console.error('Error del servidor (texto):', textError);
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Usuarios encontrados:', data);
      displaySearchResults(data.users || []);
    } catch (error) {
      console.error('Error completo:', error);
      resultsContainer.innerHTML = `<p style="color: #c41e3a; padding: 12px; background: #ffe0e6; border-radius: 8px;">Error: ${error.message || 'Error al buscar usuarios'}</p>`;
    }
  });
};

const displaySearchResults = (users) => {
  const container = document.getElementById('search-results');
  if (!container) return;

  if (users.length === 0) {
    container.innerHTML = '<p>No se encontraron usuarios</p>';
    return;
  }

  container.innerHTML = users.map(user => `
    <div class="card">
      <div class="card__header">
        ${user.profile_image_url ? `<img src="${user.profile_image_url}" alt="${user.username}" style="width: 50px; height: 50px; border-radius: 50%;">` : ''}
        <div>
          <h3>${escapeHtml(user.username)}</h3>
          <p class="card__meta">${escapeHtml(user.bio || 'Sin biografía')}</p>
        </div>
      </div>
      <button class="button button--primary" onclick="sendFriendRequest(${user.id})">
        Enviar solicitud
      </button>
    </div>
  `).join('');
};

// Enviar solicitud de amistad
window.sendFriendRequest = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/request/${userId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al enviar solicitud');
    }

    alert('Solicitud enviada correctamente');
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
};

// Cargar solicitudes de amistad recibidas
const loadFriendRequests = async () => {
  const container = document.getElementById('friend-requests-container');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/friends/requests`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar solicitudes');

    const data = await response.json();
    displayFriendRequests(data.requests || []);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar solicitudes</p>';
  }
};

const displayFriendRequests = (requests) => {
  const container = document.getElementById('friend-requests-container');
  if (!container) return;

  if (requests.length === 0) {
    container.innerHTML = '<p>No tienes solicitudes pendientes</p>';
    return;
  }

  container.innerHTML = requests.map(req => `
    <div class="card">
      <div class="card__header">
        ${req.requester.profile_image_url ? `<img src="${req.requester.profile_image_url}" alt="${req.requester.username}" style="width: 50px; height: 50px; border-radius: 50%;">` : ''}
        <div>
          <h3>${escapeHtml(req.requester.username)}</h3>
          <p class="card__meta">${escapeHtml(req.requester.bio || 'Sin biografía')}</p>
        </div>
      </div>
      <div class="card__actions">
        <button class="button button--primary" onclick="respondFriendRequest(${req.id}, true)">
          Aceptar
        </button>
        <button class="button button--secondary" onclick="respondFriendRequest(${req.id}, false)">
          Rechazar
        </button>
      </div>
    </div>
  `).join('');
};

// Responder solicitud
window.respondFriendRequest = async (friendshipId, accept) => {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/respond/${friendshipId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ accept })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al responder');
    }

    alert(accept ? 'Solicitud aceptada' : 'Solicitud rechazada');
    loadFriendRequests();
    loadFriends();
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
};

// Cargar lista de amigos
const loadFriends = async () => {
  const container = document.getElementById('friends-list-container');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar amigos');

    const data = await response.json();
    displayFriends(data.friends || []);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar amigos</p>';
  }
};

const displayFriends = (friends) => {
  const container = document.getElementById('friends-list-container');
  if (!container) return;

  if (friends.length === 0) {
    container.innerHTML = '<p>No tienes amigos aún</p>';
    return;
  }

  container.innerHTML = friends.map(friend => `
    <div class="card">
      <div class="card__header">
        ${friend.profile_image_url ? `<img src="${friend.profile_image_url}" alt="${friend.username}" style="width: 50px; height: 50px; border-radius: 50%;">` : ''}
        <div>
          <h3>${escapeHtml(friend.username)}</h3>
          <p class="card__meta">${escapeHtml(friend.bio || 'Sin biografía')}</p>
        </div>
      </div>
      <a class="button button--primary" href="mensajes.html?user=${friend.id}">
        Enviar mensaje
      </a>
    </div>
  `).join('');
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    setupUserSearch();
    loadFriendRequests();
    loadFriends();
  }
});

