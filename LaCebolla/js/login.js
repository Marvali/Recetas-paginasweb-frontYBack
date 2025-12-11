// login.js - Conecta con el backend de LaCebolla
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getLoginElements = () => {
  const form = document.getElementById('login-form');
  if (!form) return null;

  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = document.getElementById('login-message');

  if (!emailInput || !passwordInput || !submitButton) return null;

  return { form, emailInput, passwordInput, submitButton, messageElement };
};

const showLoginMessage = (element, message, type = 'error') => {
  if (!element) return;
  element.textContent = message;
  element.classList.remove('form-status-error', 'form-status-success');
  if (!message) {
    element.hidden = true;
    return;
  }

  element.hidden = false;
  element.classList.add(type === 'success' ? 'form-status-success' : 'form-status-error');
};

const handleLoginSubmit = ({ form, emailInput, passwordInput, submitButton, messageElement }) => {
  const defaultButtonText = submitButton.textContent;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showLoginMessage(messageElement, 'Ingresa tu correo y contraseña.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Ingresando…';
    showLoginMessage(messageElement, '');
    messageElement.hidden = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Credenciales inválidas');
      }

      const userData = await response.json();

      // Guardar datos de sesión en localStorage
      localStorage.setItem('userEmail', userData.email);
      localStorage.setItem('userData', JSON.stringify(userData));

      showLoginMessage(messageElement, 'Inicio de sesión exitoso. Redirigiendo…', 'success');

      setTimeout(() => {
        window.location.href = 'perfil.html';
      }, 1000);
    } catch (error) {
      showLoginMessage(messageElement, error.message || 'Error al iniciar sesión.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultButtonText;
    }
  });
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  const elements = getLoginElements();
  if (elements) handleLoginSubmit(elements);
});
