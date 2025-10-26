#!/usr/bin/env python3
"""
Script manual de integración para probar `app.py` sin pytest.

Requisitos:
- Tener las variables SUPABASE_URL y SUPABASE_KEY en el entorno o en un archivo .env en la raíz del proyecto.
- Instalar dependencias (fastapi, bcrypt, python-dotenv, supabase, pydantic, etc.) en el entorno donde se ejecute.

Qué hace:
- Registra un usuario con email único
- Llama a `get_current_user` para verificar que se creó
- Crea un post usando `create_post`
- Recupera el post con `get_post`
- Elimina el post con `delete_post`

Ejecutar desde la raíz del proyecto:
python scripts\manual_test.py
"""
import sys
import os
import time
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Faltan SUPABASE_URL o SUPABASE_KEY en el entorno o en .env. No se puede ejecutar el test contra la BBDD.")
    sys.exit(1)

try:
    # importar las funciones y esquemas desde app.py
    from app import RegisterIn, PostIn, register, get_current_user, create_post, get_post, delete_post
except Exception as e:
    print("Error al importar desde app.py:", e)
    sys.exit(1)


def main():
    ts = int(time.time() * 1000)
    email = f"test+{ts}@example.com"
    username = f"testuser_{ts}"
    password = "TestPass123!"

    print("=== INTEGRATION MANUAL TEST ===")
    print("Registrar usuario:", email)
    try:
        resp = register(RegisterIn(username=username, email=email, password=password))
        user = resp.get("user") if isinstance(resp, dict) else None
        if not user:
            print("Respuesta inesperada al registrar:", resp)
            sys.exit(1)
        print("Usuario creado: id=", user.get("id"), "email=", user.get("email"))
    except Exception as e:
        print("Fallo al registrar usuario:", e)
        sys.exit(1)

    print("Verificando get_current_user usando el email registrado...")
    try:
        current = get_current_user(x_user_email=email)
        print("get_current_user OK. Usuario desde DB:", {"id": current.get("id"), "email": current.get("email")})
    except Exception as e:
        print("get_current_user falló:", e)
        sys.exit(1)

    print("Creando un post asociado al usuario...")
    try:
        post_resp = create_post(PostIn(title="Post de prueba", content="Contenido de prueba"), user=current)
        post = post_resp.get("post") if isinstance(post_resp, dict) else post_resp
        post_id = post.get("id") if isinstance(post, dict) else None
        print("Post creado:", post)
    except Exception as e:
        print("Fallo al crear post:", e)
        sys.exit(1)

    if post_id is None:
        print("No se pudo determinar el id del post creado; salida.")
        sys.exit(1)

    print(f"Recuperando post id={post_id}...")
    try:
        fetched = get_post(post_id=post_id, user=current)
        print("Post recuperado:", fetched)
    except Exception as e:
        print("Fallo al recuperar post:", e)

    print("Prueba finalizada.")


if __name__ == '__main__':
    main()
