// noticias.js - Sistema de noticias y comentarios
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getUserEmail = () => localStorage.getItem('userEmail');
const getUserData = () => JSON.parse(localStorage.getItem('userData') || '{}');

const isLoggedIn = () => !!getUserEmail();

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-User-Email': getUserEmail()
});

// Obtener ID del post desde URL
const getPostIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
};

// Cargar noticias (general o por categoría)
const loadPosts = async (category = null, breaking = false, search = null) => {
  const container = document.getElementById('posts-container');
  if (!container) return;

  try {
    let url = `${API_BASE_URL}/posts?limit=50`;
    
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    
    if (breaking) {
      url = `${API_BASE_URL}/posts/breaking-news`;
    }
    
    if (search) {
      url = `${API_BASE_URL}/posts/search?q=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Error al cargar noticias');

    const data = await response.json();
    displayPosts(data.posts || []);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar noticias</p>';
  }
};

const displayPosts = (posts) => {
  const container = document.getElementById('posts-container');
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = '<p>No hay noticias disponibles</p>';
    return;
  }

  // Función para detectar si es de última hora (últimas 24h)
  const isBreakingNews = (createdAt) => {
    const postDate = new Date(createdAt);
    const now = new Date();
    const hoursDiff = (now - postDate) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  container.innerHTML = posts.map(post => {
    const isBreaking = isBreakingNews(post.created_at);
    return `
    <article class="card">
      ${post.image_url ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}">` : ''}
      <h2><a href="articulo.html?id=${post.id}">${escapeHtml(post.title)}</a></h2>
      <p class="card__meta">
        Por ${post.author ? escapeHtml(post.author.username) : 'Anónimo'} • 
        ${formatDate(post.created_at)} • 
        ${post.reading_time || 5} min de lectura
        ${isBreaking ? ' • <span class="tag" style="background: #ff4444; color: #fff;">ÚLTIMA HORA</span>' : ''}
      </p>
      <p>${escapeHtml(post.content.substring(0, 200))}...</p>
      <nav aria-label="Etiquetas" class="card__actions">
        ${(post.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
      </nav>
      <a class="button button--secondary" href="articulo.html?id=${post.id}">Leer más</a>
    </article>
  `;
  }).join('');
};

// Cargar un post específico
const loadPost = async (postId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
    if (!response.ok) throw new Error('Noticia no encontrada');

    const post = await response.json();
    displayPost(post);
    loadComments(postId);
  } catch (error) {
    console.error('Error:', error);
    const container = document.getElementById('post-container');
    if (container) container.innerHTML = '<p>Error al cargar la noticia</p>';
  }
};

const displayPost = (post) => {
  // Actualizar título del artículo
  const titleElement = document.querySelector('h1');
  if (titleElement) titleElement.textContent = post.title;

  // Actualizar meta información
  const metaAuthor = document.querySelector('.card__meta');
  if (metaAuthor) {
    metaAuthor.innerHTML = `Por <a href="perfil.html?id=${post.author.id}">${escapeHtml(post.author.username)}</a>`;
  }

  const metaDate = document.querySelectorAll('.card__meta')[1];
  if (metaDate) {
    metaDate.textContent = `Actualizado el ${formatFullDate(post.updated_at)} • Lectura de ${post.reading_time || 5} minutos`;
  }

  // Actualizar contenido
  const contentContainer = document.querySelector('.stack');
  if (contentContainer) {
    // Dividir contenido en párrafos
    const paragraphs = post.content.split('\n').filter(p => p.trim());
    contentContainer.innerHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }

  // Actualizar tags
  const tagsContainer = document.querySelector('.card__actions');
  if (tagsContainer && post.tags) {
    tagsContainer.innerHTML = post.tags.map(tag => 
      `<a class="tag" href="tag.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`
    ).join('');
  }

  // Mostrar imagen si existe
  if (post.image_url) {
    const article = document.querySelector('article');
    if (article) {
      const img = document.createElement('img');
      img.src = post.image_url;
      img.alt = post.title;
      article.insertBefore(img, article.firstChild);
    }
  }
};

// Cargar comentarios
const loadComments = async (postId) => {
  const container = document.getElementById('comments-container');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
    if (!response.ok) throw new Error('Error al cargar comentarios');

    const data = await response.json();
    displayComments(data.comments || [], postId);
  } catch (error) {
    console.error('Error:', error);
    container.innerHTML = '<p>Error al cargar comentarios</p>';
  }
};

const displayComments = (comments, postId) => {
  const container = document.getElementById('comments-container');
  if (!container) return;

  const commentsHtml = comments.length === 0 
    ? '<p>No hay comentarios aún. ¡Sé el primero en comentar!</p>'
    : buildCommentsTree(comments);

  container.innerHTML = `
    <h2>Comentarios (${comments.length})</h2>
    ${isLoggedIn() ? `
      <div class="card">
        <form id="comment-form" class="form-layout">
          <label for="comment-content">Deja tu comentario:</label>
          <textarea id="comment-content" name="content" required rows="4"></textarea>
          <button type="submit" class="button button--primary">Publicar comentario</button>
        </form>
      </div>
    ` : '<p><a href="login.html">Inicia sesión</a> para comentar</p>'}
    <div id="comments-list">${commentsHtml}</div>
  `;

  if (isLoggedIn()) {
    setupCommentForm(postId);
  }
};

const buildCommentsTree = (comments) => {
  // Organizar comentarios por padre
  const commentsByParent = {};
  comments.forEach(comment => {
    const parentId = comment.parent_comment_id || 'root';
    if (!commentsByParent[parentId]) {
      commentsByParent[parentId] = [];
    }
    commentsByParent[parentId].push(comment);
  });

  const renderComment = (comment, level = 0) => {
    const replies = commentsByParent[comment.id] || [];
    const marginLeft = level * 20;
    
    return `
      <div class="card" style="margin-left: ${marginLeft}px; margin-bottom: 12px;">
        <div class="card__header">
          ${comment.author.profile_image_url ? `<img src="${comment.author.profile_image_url}" alt="${comment.author.username}" style="width: 40px; height: 40px; border-radius: 50%;">` : ''}
          <div>
            <strong>${escapeHtml(comment.author.username)}</strong>
            <span class="card__meta">${formatDate(comment.created_at)}</span>
          </div>
        </div>
        <p>${escapeHtml(comment.content)}</p>
        ${replies.map(reply => renderComment(reply, level + 1)).join('')}
      </div>
    `;
  };

  const rootComments = commentsByParent['root'] || [];
  return rootComments.map(comment => renderComment(comment)).join('');
};

// Configurar formulario de comentarios
const setupCommentForm = (postId) => {
  const form = document.getElementById('comment-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const textarea = form.querySelector('textarea[name="content"]');
    const content = textarea.value.trim();

    if (!content) return;

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al publicar comentario');
      }

      textarea.value = '';
      loadComments(postId);
      alert('Comentario publicado');
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    }
  });
};

// Configurar búsqueda
const setupSearch = () => {
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  if (!searchForm || !searchInput) return;

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      loadPosts(null, false, query);
    }
  });
};

// Formato de fecha corto
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

// Formato de fecha completo
const formatFullDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Obtener categoría de la página actual
const getCurrentCategory = () => {
  const path = window.location.pathname;
  const page = path.split('/').pop().replace('.html', '');
  
  const categories = ['politica', 'economia', 'cultura', 'deportes', 'tecnologia'];
  return categories.includes(page) ? page : null;
};

// Inicializar según la página
document.addEventListener('DOMContentLoaded', () => {
  const postId = getPostIdFromUrl();
  
  if (postId) {
    // Página de artículo individual
    loadPost(postId);
  } else {
    // Página de listado de noticias
    const category = getCurrentCategory();
    const isBreaking = window.location.pathname.includes('ultima-hora');
    
    loadPosts(category, isBreaking);
    setupSearch();
  }
});

