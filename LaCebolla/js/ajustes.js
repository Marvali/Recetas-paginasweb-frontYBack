// ajustes.js - Gestión de ajustes y edición de perfil
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

// Cargar datos del perfil en el formulario
const loadProfileData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error('Error al cargar perfil');

    const user = await response.json();
    
    const usernameInput = document.getElementById('edit-username');
    const bioInput = document.getElementById('edit-bio');
    const imageInput = document.getElementById('edit-image');

    if (usernameInput) usernameInput.value = user.username || '';
    if (bioInput) bioInput.value = user.bio || '';
    if (imageInput) imageInput.value = user.profile_image_url || '';
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar los datos del perfil');
  }
};

// Configurar formulario de edición
const setupEditForm = () => {
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
      
      // Actualizar localStorage
      localStorage.setItem('userData', JSON.stringify(updatedUser));
      
      alert('Perfil actualizado correctamente');
      window.location.href = 'perfil.html';
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al actualizar perfil');
    }
  });
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  if (checkAuth()) {
    loadProfileData();
    setupEditForm();
  }
});

