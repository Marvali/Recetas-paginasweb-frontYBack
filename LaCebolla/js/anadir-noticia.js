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

// Variable global para almacenar la imagen seleccionada
let selectedImageUrl = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;

  const form = document.getElementById('news-form');
  const status = document.getElementById('form-status');
  const imageFileInput = document.getElementById('news-image-file');
  const selectImageBtn = document.getElementById('select-image-btn');
  const imagePasteArea = document.getElementById('news-image-paste');
  const imagePasteLabel = document.querySelector('label[for="news-image-paste"]');
  const imagePreview = document.getElementById('image-preview');
  const imagePreviewContainer = document.getElementById('image-preview-container');
  const removeImageBtn = document.getElementById('remove-image-btn');

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

  // Función para mostrar vista previa de imagen
  const showImagePreview = (imageUrl) => {
    selectedImageUrl = imageUrl;
    imagePreview.src = imageUrl;
    imagePreviewContainer.style.display = 'block';
  };

  // Función para eliminar imagen
  const removeImage = () => {
    selectedImageUrl = null;
    imagePreview.src = '';
    imagePreviewContainer.style.display = 'none';
    if (imageFileInput) imageFileInput.value = '';
    if (imagePasteArea) imagePasteArea.value = '';
  };

  // Botón para seleccionar archivo
  if (selectImageBtn && imageFileInput) {
    selectImageBtn.addEventListener('click', () => {
      imageFileInput.click();
    });

    imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB
          setStatus('La imagen es demasiado grande. Máximo 5MB.', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          showImagePreview(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Pegar imagen desde portapapeles en el área de pegar
  if (imagePasteLabel) {
    // Hacer que el label sea focusable para recibir eventos de pegar
    imagePasteLabel.setAttribute('tabindex', '0');
    
    imagePasteLabel.addEventListener('paste', async (e) => {
      e.preventDefault();
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob.size > 5 * 1024 * 1024) {
            setStatus('La imagen es demasiado grande. Máximo 5MB.', 'error');
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            showImagePreview(event.target.result);
            setStatus('Imagen pegada correctamente', 'success');
            setTimeout(() => setStatus(''), 2000);
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    });

    // Permitir pegar con Ctrl+V cuando el label tiene foco
    imagePasteLabel.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // El evento paste se manejará automáticamente
      }
    });
  }

  // También permitir pegar URL en el campo de texto
  if (imagePasteArea) {
    imagePasteArea.addEventListener('paste', (e) => {
      setTimeout(() => {
        const url = imagePasteArea.value.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
          showImagePreview(url);
          setStatus('URL de imagen cargada', 'success');
          setTimeout(() => setStatus(''), 2000);
        }
      }, 100);
    });

    imagePasteArea.addEventListener('input', () => {
      const url = imagePasteArea.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // Validar que sea una URL de imagen válida
        const img = new Image();
        img.onload = () => {
          showImagePreview(url);
        };
        img.onerror = () => {
          // No es una imagen válida, pero dejamos que el usuario lo intente
        };
        img.src = url;
      }
    });

    imagePasteArea.addEventListener('blur', () => {
      const url = imagePasteArea.value.trim();
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        showImagePreview(url);
      }
    });
  }

  // Permitir pegar imágenes en cualquier parte del formulario cuando se hace foco en el área
  if (imagePasteLabel) {
    imagePasteLabel.addEventListener('click', () => {
      imagePasteLabel.focus();
    });
  }

  // Botón para eliminar imagen
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', removeImage);
  }

  // Contador de etiquetas seleccionadas
  const tagsSelect = document.getElementById('news-tags');
  const updateTagsCounter = () => {
    if (tagsSelect) {
      const selectedCount = tagsSelect.selectedOptions.length;
      const tagsLabel = document.querySelector('label[for="news-tags"]');
      if (tagsLabel) {
        const counter = tagsLabel.querySelector('.tags-counter');
        if (counter) {
          counter.textContent = `(${selectedCount} seleccionada${selectedCount !== 1 ? 's' : ''})`;
        } else if (selectedCount > 0) {
          const counterSpan = document.createElement('span');
          counterSpan.className = 'tags-counter';
          counterSpan.style.cssText = 'color: #0f6d2a; font-weight: 600; margin-left: 8px;';
          counterSpan.textContent = `(${selectedCount} seleccionada${selectedCount !== 1 ? 's' : ''})`;
          tagsLabel.appendChild(counterSpan);
        }
      }
    }
  };

  if (tagsSelect) {
    tagsSelect.addEventListener('change', updateTagsCounter);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const title = (formData.get('title') || '').toString().trim();
    const section = (formData.get('section') || '').toString();
    const body = (formData.get('body') || '').toString().trim();
    
    // Obtener imagen (de la vista previa o del campo de URL)
    let imageUrl = selectedImageUrl;
    if (!imageUrl && imagePasteArea) {
      const pasteUrl = imagePasteArea.value.trim();
      if (pasteUrl) {
        // Puede ser URL o base64
        if (pasteUrl.startsWith('http://') || pasteUrl.startsWith('https://') || pasteUrl.startsWith('data:image/')) {
          imageUrl = pasteUrl;
        }
      }
    }
    
    // Si la imagen es base64 y es muy grande, advertir al usuario
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      const base64Length = imageUrl.length;
      if (base64Length > 1000000) { // ~1MB en base64
        const useBase64 = confirm('La imagen es grande. Se guardará en formato base64. ¿Continuar?');
        if (!useBase64) {
          setStatus('Por favor, usa una URL de imagen o una imagen más pequeña.', 'error');
          return;
        }
      }
    }
    
    // Obtener tags del select múltiple
    const tagsSelect = document.getElementById('news-tags');
    if (!tagsSelect) {
      setStatus('Error: No se encontró el selector de etiquetas.', 'error');
      return;
    }
    
    const tags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
    
    if (tags.length === 0) {
      setStatus('Selecciona al menos una etiqueta.', 'error');
      tagsSelect.focus();
      return;
    }

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
          reading_time: Math.ceil(body.split(' ').length / 200) // Estimación
          // is_breaking_news se detecta automáticamente (últimas 24h)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al publicar la noticia');
      }

      const result = await response.json();
      setStatus('¡Noticia publicada con éxito!', 'success');
      form.reset();
      removeImage(); // Limpiar imagen

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
