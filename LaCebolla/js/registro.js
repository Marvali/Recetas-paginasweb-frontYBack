const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getRegisterElements = () => {
  const form = document.getElementById('register-form');
  if (!form) return null;

  const usernameInput = form.querySelector('input[name="username"]');
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const messageElement = document.getElementById('register-message');

  if (!usernameInput || !emailInput || !passwordInput || !submitButton)
    return null;

  return { form, usernameInput, emailInput, passwordInput, submitButton, messageElement };
};

const showRegisterMessage = (element, message, type = 'error') => {
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

const handleRegisterSubmit = ({ form, usernameInput, emailInput, passwordInput, submitButton, messageElement }) => {
  const defaultButtonText = submitButton.textContent;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!username || !email || !password) {
      showRegisterMessage(messageElement, 'Por favor, completa todos los campos.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Registrando...';
    showRegisterMessage(messageElement, '');
    messageElement.hidden = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Error al registrar usuario.');
      }

      showRegisterMessage(messageElement, 'Registro exitoso. Redirigiendo al inicio de sesión...', 'success');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (error) {
      showRegisterMessage(messageElement, error.message || 'Error inesperado al registrar.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultButtonText;
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const elements = getRegisterElements();
  if (elements) handleRegisterSubmit(elements);
});
