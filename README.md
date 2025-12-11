# LaCebolla - Sistema de Noticias Completo 📰
📚 Práctica Arquitectura y Diseño de Sistemas Web – Universidad de Alcalá  

## 🎯 Descripción

**LaCebolla** es una plataforma completa de noticias digitales con backend y frontend totalmente funcionales. El proyecto implementa un sistema de gestión de noticias con autenticación, perfiles de usuario, sistema de amigos, mensajería y comentarios.

## ✨ Características Principales

### 🔐 Sistema de Autenticación
- Registro de usuarios con validación
- Login seguro con bcrypt
- Gestión de sesiones con localStorage
- Sistema de roles (reader, editor, admin)

### 👤 Perfiles de Usuario
- Perfil personalizable con foto y biografía
- Visualización de publicaciones propias
- Edición de información personal

### 👥 Sistema Social
- **Búsqueda de usuarios** por username
- **Solicitudes de amistad** (enviar, aceptar, rechazar)
- **Lista de amigos** activos
- **Mensajería privada** entre usuarios

### 📝 Gestión de Noticias
- **Publicación de noticias** (solo editores/admins)
- **Categorías**: Política, Economía, Cultura, Deportes, Tecnología
- **Etiquetas (tags)** personalizadas
- **Noticias de última hora** (últimas 24h)
- **Búsqueda** por texto completo
- **Filtrado** por categoría

### 💬 Sistema de Comentarios
- Comentarios en noticias
- Threading (comentarios anidados)
- Eliminación de comentarios propios

## 🛠️ Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno de Python
- **PostgreSQL** - Base de datos (via Supabase)
- **bcrypt** - Hash de contraseñas
- **python-dotenv** - Variables de entorno
- **Supabase Client** - SDK para PostgreSQL

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Diseño responsive
- **JavaScript** (Vanilla) - Interactividad
- **Fetch API** - Comunicación con backend

### Base de Datos
- **Supabase** (PostgreSQL)
- 5 tablas principales: users, posts, friendships, messages, comments
- Índices optimizados
- Triggers automáticos
- Función de búsqueda full-text

## 📦 Instalación Rápida

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd Recetas-paginasweb-frontYBack
```

### 2. Configurar la Base de Datos

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script `backend/supabase_schema.sql` en el SQL Editor
3. Copia tu URL y API Key

### 3. Configurar el Backend

```bash
cd backend
pip install -r requirements.txt

# Crear archivo .env (ver backend/env.example)
echo "SUPABASE_URL=tu_url" > .env
echo "SUPABASE_KEY=tu_key" >> .env

# Iniciar servidor
uvicorn app:app --reload
```

### 4. Acceder a la Aplicación

Abre tu navegador en: **http://localhost:8000**

## 📚 Documentación Completa

Ver **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** para:
- Guía detallada de instalación
- Documentación de API endpoints
- Configuración de producción
- Solución de problemas

## 🗂️ Estructura del Proyecto

```
├── backend/
│   ├── app.py                 # API FastAPI completa
│   ├── requirements.txt       # Dependencias Python
│   ├── supabase_schema.sql    # Schema de BD
│   └── env.example            # Plantilla de variables
├── LaCebolla/                 # Frontend
│   ├── css/style.css          # Estilos
│   ├── js/                    # Scripts
│   │   ├── login.js
│   │   ├── registro.js
│   │   ├── perfil.js
│   │   ├── amigos.js
│   │   ├── mensajes.js
│   │   ├── noticias.js
│   │   └── anadir-noticia.js
│   └── *.html                 # Páginas
└── DEPLOYMENT_GUIDE.md        # Guía completa
```

## 🚀 Funcionalidades Implementadas

- ✅ Registro y login con autenticación
- ✅ Perfiles de usuario con foto
- ✅ Sistema de amigos completo
- ✅ Mensajería privada
- ✅ Publicación de noticias
- ✅ Categorías de noticias
- ✅ Sistema de búsqueda
- ✅ Noticias de última hora
- ✅ Comentarios en noticias
- ✅ Sistema de roles y permisos
- ✅ Diseño responsive

## 👨‍💻 Uso

### Usuarios de Prueba

El sistema incluye 3 usuarios de ejemplo (contraseña: `password`):

- **admin@lacebolla.com** (Administrador)
- **editor@lacebolla.com** (Editor)
- **alicia@lacebolla.com** (Editora)

### Flujo Básico

1. **Registrarse** o usar un usuario de prueba
2. **Editar perfil** en la sección "Mi cuenta"
3. **Buscar amigos** y enviar solicitudes
4. **Leer noticias** por categoría
5. **Comentar** en las noticias
6. **Publicar noticias** (si eres editor/admin)
7. **Enviar mensajes** a tus amigos

## 🎨 Diseño

- Paleta de colores verde (#0f6d2a) corporativa
- Layout basado en cards
- Diseño responsive mobile-first
- Navegación intuitiva
- Accesibilidad ARIA

## 📄 Licencia

Proyecto académico - Universidad de Alcalá 2025/2026

## 🙏 Créditos

Desarrollado como práctica de la asignatura *Arquitectura y Diseño de Sistemas Web y C/S*

---

**Estado**: ✅ Completo y listo para producción
