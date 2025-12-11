// anadir-noticia.js - Publicar noticias en el backend
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

const SECTION_LABELS = {
  'politica': 'Política',
  'economia': 'Economía',
  'cultura': 'Cultura',
  'deportes': 'Deportes',
  'tecnologia': 'Tecnología',
};

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  const form = document.getElementById('news-form');
  const status = document.getElementById('form-status');

  if (!form || !status) {
    return;
  }

  const setStatus = (message, type = 'neutral') => {
    status.textContent = message;
    status.hidden = !message;
    status.classList.remove('form-status-error', 'form-status-success');

    if (!message) return;

    if (type === 'error') {
      status.classList.add('form-status-error');
    } else if (type === 'success') {
      status.classList.add('form-status-success');
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = (formData.get('title') || '').toString().trim();
    const section = (formData.get('section') || '').toString();
    const body = (formData.get('body') || '').toString().trim();
    const imageUrl = (formData.get('image_url') || '').toString().trim();
    const tags = (formData.get('tags') || '').toString().trim().split(',').map(t => t.trim()).filter(t => t);
    const isBreaking = formData.get('is_breaking') === 'on';

    if (!title || !section || !body) {
      setStatus('Revisa que el título, la sección y el texto estén completos.', 'error');
      return;
    }

    const userData = getUserData();
    if (userData.role !== 'editor' && userData.role !== 'admin') {
      setStatus('Solo editores y administradores pueden publicar noticias.', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: title,
          content: body,
          category: section,
          image_url: imageUrl || null,
          tags: tags,
          is_breaking_news: isBreaking,
          reading_time: Math.ceil(body.split(' ').length / 200) // Estimación
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al publicar la noticia');
      }

      const result = await response.json();
      setStatus('¡Noticia publicada con éxito!', 'success');
      form.reset();

      // Redirigir al artículo después de 2 segundos
      setTimeout(() => {
        const postId = result.post.id || result.post[0]?.id;
        if (postId) {
          window.location.href = `articulo.html?id=${postId}`;
        }
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setStatus(error.message || 'Error al publicar la noticia', 'error');
    }
  });

  setStatus('');
});
