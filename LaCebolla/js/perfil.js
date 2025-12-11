// perfil.js - Gestión de perfil de usuario
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Obtener email del usuario desde localStorage
const getUserEmail = () => localStorage.getItem('userEmail');
const getUserData = () => JSON.parse(localStorage.getItem('userData') || '{}');

// Verificar si el usuario está logueado
const checkAuth = () => {
  const email = getUserEmail();
  if (!email) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

// Headers con autenticación
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-User-Email': getUserEmail()
});

// Cerrar sesión
const logout = () => {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userData');
  window.location.href = 'login.html';
};

// Cargar perfil del usuario
const loadUserProfile = async () => {
  if (!checkAuth()) return;

  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Error al cargar perfil');
    }

    const user = await response.json();
    displayUserProfile(user);
    
    // Actualizar localStorage
    localStorage.setItem('userData', JSON.stringify(user));
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar el perfil');
  }
};

// Mostrar datos del perfil
const displayUserProfile = (user) => {
  const usernameElement = document.getElementById('profile-username');
  const emailElement = document.getElementById('profile-email');
  const bioElement = document.getElementById('profile-bio');
  const imageElement = document.getElementById('profile-image');
  const roleElement = document.getElementById('profile-role');

  if (usernameElement) usernameElement.textContent = user.username || 'Usuario';
  if (emailElement) emailElement.textContent = user.email || '';
  if (bioElement) bioElement.textContent = user.bio || 'Sin biografía';
  if (roleElement) roleElement.textContent = user.role || 'reader';
  
  if (imageElement && user.profile_image_url) {
    imageElement.src = user.profile_image_url;
    imageElement.alt = `Foto de perfil de ${user.username}`;
  }
};

// Actualizar perfil
const setupProfileForm = () => {
  const form = document.getElementById('edit-profile-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const usernameInput = form.querySelector('input[name="username"]');
    const bioInput = form.querySelector('textarea[name="bio"]');
    const imageInput = form.querySelector('input[name="profile_image_url"]');

    const updateData = {
      username: usernameInput?.value.trim(),
      bio: bioInput?.value.trim(),
      profile_image_url: imageInput?.value.trim()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al actualizar perfil');
      }

      const updatedUser = await response.json();
      displayUserProfile(updatedUser);
      alert('Perfil actualizado correctamente');
      
      // Recargar perfil
      loadUserProfile();
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al actualizar perfil');
    }
  });
};

// Cargar posts del usuario
const loadUserPosts = async () => {
  // Obtener el ID del usuario desde el perfil cargado, no del localStorage
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar perfil');

    const user = await response.json();
    const userId = user.id;

    if (!userId) {
      console.error('No se pudo obtener el ID del usuario');
      return;
    }

    // Cargar solo los posts del usuario autenticado
    const postsResponse = await fetch(`${API_BASE_URL}/posts?author_id=${userId}`, {
      headers: getAuthHeaders()
    });

    if (!postsResponse.ok) throw new Error('Error al cargar publicaciones');

    const data = await postsResponse.json();
    
    // Filtrar adicionalmente por si acaso (doble verificación)
    const userPosts = (data.posts || []).filter(post => post.author_id === userId);
    
    displayUserPosts(userPosts);
  } catch (error) {
    console.error('Error:', error);
    const container = document.getElementById('user-posts-container');
    if (container) {
      container.innerHTML = '<p style="color: #c41e3a;">Error al cargar tus publicaciones</p>';
    }
  }
};

// Mostrar posts del usuario
const displayUserPosts = (posts) => {
  const container = document.getElementById('user-posts-container');
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No tienes publicaciones aún. <a href="anadir-noticia.html">Publica tu primera noticia</a></p>';
    return;
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Obtener el ID del usuario actual para verificación adicional
  const currentUser = getUserData();
  const currentUserId = currentUser.id;

  container.innerHTML = posts
    .filter(post => {
      // Filtrar solo posts del usuario actual (triple verificación)
      return post.author_id === currentUserId || (post.author && post.author.id === currentUserId);
    })
    .map(post => `
    <article class="card" style="padding: 20px;">
      <h3 style="margin-top: 0;">${escapeHtml(post.title)}</h3>
      <p class="card__meta">
        <span class="tag">${post.category}</span> • 
        ${formatDate(post.created_at)}
      </p>
      <p>${escapeHtml(post.content.substring(0, 150))}...</p>
      <a href="articulo.html?id=${post.id}" class="button button--secondary" style="margin-top: 12px; display: inline-block;">Leer más</a>
    </article>
  `).join('');
};

// Escapar HTML
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Configurar botón de cerrar sesión
const setupLogoutButton = () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Deseas cerrar sesión?')) {
        logout();
      }
    });
  }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    loadUserProfile();
    loadUserPosts();
    setupProfileForm();
    setupLogoutButton();
  }
});

