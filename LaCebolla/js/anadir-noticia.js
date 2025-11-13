const STORAGE_KEY = 'lcebolla-news-submissions';

const SECTION_LABELS = {
  'ultima-hora': 'Última Hora',
  tendencias: 'Tendencias',
  politica: 'Política',
  economia: 'Economía',
  cultura: 'Cultura',
  deportes: 'Deportes',
  tecnologia: 'Tecnología',
  opinion: 'Opinión'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('news-form');
  const status = document.getElementById('form-status');
  const list = document.getElementById('submission-list');
  const template = document.getElementById('submission-item-template');
  const clearButton = document.getElementById('clear-submissions');

  if (!form || !status || !list || !template || !clearButton) {
    return;
  }

  const setStatus = (message, type = 'neutral') => {
    status.textContent = message;
    status.hidden = !message;
    status.classList.remove('form-status-error', 'form-status-success');

    if (!message) {
      return;
    }

    if (type === 'error') {
      status.classList.add('form-status-error');
    } else if (type === 'success') {
      status.classList.add('form-status-success');
    }
  };

  const storageIsAvailable = () => {
    try {
      const testKey = `${STORAGE_KEY}-test`;
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage no está disponible:', error);
      return false;
    }
  };

  const readSubmissions = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed;
    } catch (error) {
      console.error('No se pudieron recuperar los borradores:', error);
      return [];
    }
  };

  const persistSubmissions = (submissions) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return 'Fecha desconocida';
    }

    return date.toLocaleString('es-ES', {
      dateStyle: 'long',
      timeStyle: 'short'
    });
  };

  const createExcerpt = (text) => {
    const trimmed = text.trim().replace(/\s+/g, ' ');
    const limit = 220;

    if (trimmed.length <= limit) {
      return trimmed;
    }

    return `${trimmed.slice(0, limit)}…`;
  };

  const renderSubmissions = () => {
    const submissions = readSubmissions();
    list.innerHTML = '';

    if (submissions.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.classList.add('card');
      emptyItem.textContent = 'Todavía no guardaste borradores.';
      list.appendChild(emptyItem);
      return;
    }

    submissions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .forEach((submission) => {
        const clone = template.content.firstElementChild.cloneNode(true);
        const tag = clone.querySelector('[data-role="submission-tag"]');
        const title = clone.querySelector('[data-role="submission-title"]');
        const excerpt = clone.querySelector('[data-role="submission-excerpt"]');
        const meta = clone.querySelector('[data-role="submission-meta"]');

        if (tag) {
          tag.textContent = SECTION_LABELS[submission.section] || 'Sección sin definir';
        }

        if (title) {
          title.textContent = submission.title;
        }

        if (excerpt) {
          excerpt.textContent = createExcerpt(submission.body);
        }

        if (meta) {
          meta.textContent = `Guardado el ${formatDate(submission.createdAt)}`;
        }

        list.appendChild(clone);
      });
  };

  if (!storageIsAvailable()) {
    setStatus('El almacenamiento local está desactivado. No es posible guardar borradores en este navegador.', 'error');
    form.querySelector('[type="submit"]')?.setAttribute('disabled', 'true');
    clearButton.setAttribute('disabled', 'true');
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = (formData.get('title') || '').toString().trim();
    const section = (formData.get('section') || '').toString();
    const body = (formData.get('body') || '').toString().trim();

    if (!title || !section || !body) {
      setStatus('Revisa que el título, la sección y el texto estén completos.', 'error');
      return;
    }

    const submissions = readSubmissions();

    const identifier = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString();

    submissions.push({
      id: identifier,
      title,
      section,
      body,
      createdAt: new Date().toISOString()
    });

    persistSubmissions(submissions);
    renderSubmissions();
    form.reset();
    setStatus('La propuesta se guardó como borrador local.', 'success');
    form.querySelector('input, select, textarea')?.focus();
  });

  clearButton.addEventListener('click', () => {
    const submissions = readSubmissions();

    if (submissions.length === 0) {
      setStatus('No hay borradores para eliminar.', 'neutral');
      return;
    }

    const confirmed = window.confirm('¿Seguro que quieres borrar todos los borradores guardados?');
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    renderSubmissions();
    setStatus('Los borradores se eliminaron del almacenamiento local.', 'success');
  });

  renderSubmissions();
  setStatus('');
});
