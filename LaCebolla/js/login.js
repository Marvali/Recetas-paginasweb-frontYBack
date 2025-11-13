// Conecta el frontend con tu servidor FastAPI local
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Obtener referencias a los elementos del formulario
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

// Mostrar mensajes de estado
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

// Función principal de login (simulada con X-User-Email)
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
      // Verificar si el usuario existe mediante el endpoint /users/me
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          'X-User-Email': email
        }
      });

      if (!response.ok) {
        throw new Error('Usuario no encontrado o credenciales inválidas.');
      }

      const user = await response.json();

      // Guardar el email del usuario localmente (simula sesión)
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userData', JSON.stringify(user));

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
