# app.py - minimalísimo: registro + uso de X-User-Email como "auth"
import os
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, status
from pydantic import BaseModel, EmailStr
import bcrypt
from supabase import create_client
from dotenv import load_dotenv

from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

# --- CONFIG: cambia estas vars en .env ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# --- INIT ---
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="FastAPI")

# --- Permitir peticiones desde cualquier origen (CORS abierto)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # ← permite TODOS los orígenes
    allow_credentials=True,
    allow_methods=["*"],        # ← permite todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],        # ← permite todas las cabeceras personalizadas
)

API_PREFIX = "/api/v1"



# --- SCHEMAS ---
class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str

class PostIn(BaseModel):
    title: str
    content: str

# --- HELPERS ---
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def _res_error(res):
    """Compat helper: extrae el error de la respuesta del cliente Supabase.

    Algunas versiones del cliente devuelven un objeto con atributos `data`/`error`.
    Otras devuelven un dict-like. Normalizamos ambos casos.
    """
    # atributo .error en objetos tipo APIResponse
    if hasattr(res, "error"):
        try:
            return getattr(res, "error")
        except Exception:
            return None
    # dict-like
    if isinstance(res, dict):
        return res.get("error")
    return None


def _res_data(res):
    """Compat helper: extrae data de la respuesta del cliente Supabase."""
    if hasattr(res, "data"):
        try:
            return getattr(res, "data")
        except Exception:
            return None
    if isinstance(res, dict):
        return res.get("data")
    return None


def sb_get_one(table: str, col: str, val):
    res = supabase.table(table).select("*").eq(col, val).limit(1).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return (_res_data(res) or [None])[0]

def sb_get_all(table: str):
    res = supabase.table(table).select("*").execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res) or []

def sb_insert(table: str, obj: dict):
    res = supabase.table(table).insert(obj).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res)

def sb_delete(table: str, col: str, val):
    res = supabase.table(table).delete().eq(col, val).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res)

# --- "Autenticación" mínima basada en header X-User-Email ---
def get_current_user(x_user_email: Optional[str] = Header(None, alias="X-User-Email")):
    if not x_user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Falta header X-User-Email")
    user = sb_get_one("users", "email", x_user_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    return user

# --- RUTAS ---
@app.post(f"{API_PREFIX}/auth/register", status_code=201)
def register(data: RegisterIn):
    # minimal: solo bloqueo si existe email
    existing = sb_get_one("users", "email", data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    now = datetime.utcnow().isoformat() + "Z"
    user_obj = {
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "created_at": now
    }
    created = sb_insert("users", user_obj)
    user = created[0] if isinstance(created, list) and created else created
    return {"message": "Usuario creado", "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}

@app.get(f"{API_PREFIX}/users/me")
def me(user: dict = Depends(get_current_user)):
    # devuelve info pública del usuario identificado por X-User-Email
    return {"id": user["id"], "username": user["username"], "email": user["email"], "created_at": user.get("created_at")}

# POSTS mínimos
@app.get(f"{API_PREFIX}/posts")
def list_posts(user: dict = Depends(get_current_user)):
    posts = sb_get_all("posts")
    return {"posts": posts}

@app.post(f"{API_PREFIX}/posts", status_code=201)
def create_post(payload: PostIn, user: dict = Depends(get_current_user)):
    now = datetime.utcnow().isoformat() + "Z"
    obj = {"title": payload.title, "content": payload.content, "author_id": user["id"], "created_at": now}
    created = sb_insert("posts", obj)
    return {"message": "Creado", "post": created[0] if isinstance(created, list) and created else created}

@app.get(f"{API_PREFIX}/posts/{{post_id}}")
def get_post(post_id: int, user: dict = Depends(get_current_user)):
    post = sb_get_one("posts", "id", post_id)
    if not post:
        raise HTTPException(status_code=404, detail="No encontrado")
    return post

@app.delete(f"{API_PREFIX}/posts/{{post_id}}")
def delete_post(post_id: int, user: dict = Depends(get_current_user)):
    post = sb_get_one("posts", "id", post_id)
    if not post:
        raise HTTPException(status_code=404, detail="No encontrado")
    # comprobación mínima: solo autor puede borrar
    if post.get("author_id") != user["id"]:
        raise HTTPException(status_code=403, detail="No permitido")
    sb_delete("posts", "id", post_id)
    return {"message": "Eliminado"}

@app.get("/health")
def health():
    return {"status": "ok"}



