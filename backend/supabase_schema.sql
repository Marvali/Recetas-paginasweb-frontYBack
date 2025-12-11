-- ====================================
-- SCHEMA COMPLETO PARA LACEBOLLA
-- ====================================

-- 1) Enum para roles de usuario
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('reader', 'editor', 'admin');
  END IF;
END$$;

-- Enum para estado de amistad
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'friendship_status') THEN
    CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
  END IF;
END$$;

-- Enum para categorías de noticias
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'news_category') THEN
    CREATE TYPE news_category AS ENUM ('politica', 'economia', 'cultura', 'deportes', 'tecnologia', 'ultima-hora');
  END IF;
END$$;

-- 2) Tabla: users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profile_image_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  role user_role NOT NULL DEFAULT 'reader',
  is_active BOOLEAN DEFAULT true
);

-- 3) Tabla: posts (noticias)
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category news_category NOT NULL DEFAULT 'politica',
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url VARCHAR(500),
  tags TEXT[],
  is_breaking_news BOOLEAN DEFAULT false,
  reading_time INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) Tabla: friendships (relaciones de amistad)
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- 5) Tabla: messages (mensajes entre usuarios)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) Tabla: comments (comentarios en posts)
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7) Índices para optimización
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_breaking_news ON posts(is_breaking_news, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- 8) Triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_posts_updated_at ON posts;
CREATE TRIGGER trg_update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_users_updated_at ON users;
CREATE TRIGGER trg_update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_friendships_updated_at ON friendships;
CREATE TRIGGER trg_update_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_comments_updated_at ON comments;
CREATE TRIGGER trg_update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 9) Función para buscar noticias con texto completo
CREATE OR REPLACE FUNCTION search_posts(search_query TEXT)
RETURNS TABLE (
  id INTEGER,
  title VARCHAR(255),
  content TEXT,
  category news_category,
  author_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.category,
    p.author_id,
    p.created_at,
    ts_rank(
      to_tsvector('spanish', p.title || ' ' || p.content),
      plainto_tsquery('spanish', search_query)
    ) as relevance
  FROM posts p
  WHERE 
    to_tsvector('spanish', p.title || ' ' || p.content) @@ plainto_tsquery('spanish', search_query)
  ORDER BY relevance DESC, p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 10) Vista para noticias de última hora (últimas 24h)
CREATE OR REPLACE VIEW breaking_news_24h AS
SELECT 
  p.*,
  u.username as author_name,
  u.profile_image_url as author_image
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE 
  p.created_at >= NOW() - INTERVAL '24 hours'
  OR p.is_breaking_news = true
ORDER BY p.created_at DESC;

-- 11) Datos de ejemplo (opcional - comentar si no se desea)
-- Insertar usuarios de ejemplo
INSERT INTO users (username, email, password_hash, bio, role) VALUES
  ('admin', 'admin@lacebolla.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Nz8B/m', 'Administrador del sistema', 'admin'),
  ('editor1', 'editor@lacebolla.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Nz8B/m', 'Editor de noticias', 'editor'),
  ('aliciamendoza', 'alicia@lacebolla.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Nz8B/m', 'Periodista especializada en medio ambiente', 'editor')
ON CONFLICT (email) DO NOTHING;

-- Insertar posts de ejemplo
INSERT INTO posts (title, content, category, author_id, tags, reading_time, is_breaking_news) VALUES
  (
    'Comunidades costeras apuestan por la energía mareomotriz',
    'La cooperativa La Brisa inauguró el primer sistema mareomotriz comunitario del Caribe. El proyecto, financiado por aportes vecinales y cooperación internacional, proveerá electricidad limpia a 2.500 hogares. El ingeniero Carlos Cáceres explica que el sistema aprovecha las mareas con turbinas de baja velocidad, minimizando el impacto en la fauna marina.',
    'tecnologia',
    3,
    ARRAY['energía', 'innovación', 'comunidades'],
    6,
    false
  ),
  (
    'Crisis política: dimite el ministro de economía',
    'En una conferencia de prensa inesperada, el ministro de economía anunció su renuncia efectiva inmediata tras las controversias de la última semana.',
    'politica',
    2,
    ARRAY['política', 'gobierno', 'crisis'],
    4,
    true
  ),
  (
    'El festival de música indie llega a su décima edición',
    'Miles de personas se reunirán este fin de semana para disfrutar de tres días de música en vivo con más de 50 artistas nacionales e internacionales.',
    'cultura',
    3,
    ARRAY['música', 'festival', 'cultura'],
    5,
    false
  )
ON CONFLICT DO NOTHING;

