# app.py - Backend completo LaCebolla
import os
from datetime import datetime, timedelta
from typing import Optional, List
import base64

from fastapi import FastAPI, HTTPException, Depends, Header, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from pydantic import BaseModel, EmailStr
import bcrypt
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# === CONFIG ===
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
app = FastAPI(title="LaCebolla API")

# Frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../LaCebolla")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(frontend_path, "index.html"))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

# === SCHEMAS ===
class RegisterIn(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    user_id: int
    username: str
    email: str
    role: str
    profile_image_url: Optional[str] = None

class UpdateProfileIn(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None

class PostIn(BaseModel):
    title: str
    content: str
    category: str
    tags: Optional[List[str]] = []
    image_url: Optional[str] = None
    is_breaking_news: Optional[bool] = False
    reading_time: Optional[int] = 5

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    is_breaking_news: Optional[bool] = None

class CommentIn(BaseModel):
    content: str
    parent_comment_id: Optional[int] = None

class MessageIn(BaseModel):
    receiver_id: int
    content: str

class FriendRequestResponse(BaseModel):
    accept: bool  # True = accept, False = reject

# === HELPERS ===
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def _res_error(res):
    if hasattr(res, "error"):
        try:
            return getattr(res, "error")
        except Exception:
            return None
    if isinstance(res, dict):
        return res.get("error")
    return None

def _res_data(res):
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
    data = _res_data(res)
    return (data or [None])[0]

def sb_get_all(table: str, order_by: str = None, limit: int = None):
    query = supabase.table(table).select("*")
    if order_by:
        query = query.order(order_by)
    if limit:
        query = query.limit(limit)
    res = query.execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res) or []

def sb_insert(table: str, obj: dict):
    res = supabase.table(table).insert(obj).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res)

def sb_update(table: str, obj: dict, col: str, val):
    res = supabase.table(table).update(obj).eq(col, val).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res)

def sb_delete(table: str, col: str, val):
    res = supabase.table(table).delete().eq(col, val).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res)

def sb_query(query):
    """Ejecuta query personalizada"""
    res = query.execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    return _res_data(res) or []

# === AUTH ===
def get_current_user(x_user_email: Optional[str] = Header(None, alias="X-User-Email")):
    if not x_user_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Falta header X-User-Email")
    user = sb_get_one("users", "email", x_user_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado")
    if not user.get("is_active"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario inactivo")
    return user

# === ENDPOINTS AUTH ===
@app.post(f"{API_PREFIX}/auth/register", status_code=201)
def register(data: RegisterIn):
    existing = sb_get_one("users", "email", data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    existing_username = sb_get_one("users", "username", data.username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Username ya en uso")
    
    now = datetime.utcnow().isoformat() + "Z"
    user_obj = {
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "created_at": now
    }
    created = sb_insert("users", user_obj)
    user = created[0] if isinstance(created, list) and created else created
    return {
        "message": "Usuario creado",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"]
        }
    }

@app.post(f"{API_PREFIX}/auth/login")
def login(data: LoginIn):
    user = sb_get_one("users", "email", data.email)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuario inactivo")
    
    return {
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user.get("role", "reader"),
        "profile_image_url": user.get("profile_image_url")
    }

# === ENDPOINTS USERS ===
@app.get(f"{API_PREFIX}/users/me")
def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "bio": user.get("bio"),
        "profile_image_url": user.get("profile_image_url"),
        "role": user.get("role"),
        "created_at": user.get("created_at")
    }

@app.put(f"{API_PREFIX}/users/me")
def update_profile(data: UpdateProfileIn, user: dict = Depends(get_current_user)):
    update_data = {}
    if data.username is not None:
        # Verificar que no exista otro usuario con ese username
        existing = sb_get_one("users", "username", data.username)
        if existing and existing["id"] != user["id"]:
            raise HTTPException(status_code=400, detail="Username ya en uso")
        update_data["username"] = data.username
    
    if data.bio is not None:
        update_data["bio"] = data.bio
    
    if data.profile_image_url is not None:
        update_data["profile_image_url"] = data.profile_image_url
    
    if update_data:
        sb_update("users", update_data, "id", user["id"])
    
    updated_user = sb_get_one("users", "id", user["id"])
    return {
        "id": updated_user["id"],
        "username": updated_user["username"],
        "email": updated_user["email"],
        "bio": updated_user.get("bio"),
        "profile_image_url": updated_user.get("profile_image_url")
    }

@app.get(f"{API_PREFIX}/users/{{user_id}}")
def get_user_profile(user_id: int, user: dict = Depends(get_current_user)):
    target_user = sb_get_one("users", "id", user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "id": target_user["id"],
        "username": target_user["username"],
        "bio": target_user.get("bio"),
        "profile_image_url": target_user.get("profile_image_url"),
        "created_at": target_user.get("created_at")
    }

@app.get(f"{API_PREFIX}/users/search")
def search_users(q: str = Query(..., min_length=1), user: dict = Depends(get_current_user)):
    res = supabase.table("users").select("id, username, email, profile_image_url, bio").ilike("username", f"%{q}%").limit(20).execute()
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    users = _res_data(res) or []
    return {"users": users}

# === ENDPOINTS FRIENDS ===
@app.post(f"{API_PREFIX}/friends/request/{{addressee_id}}", status_code=201)
def send_friend_request(addressee_id: int, user: dict = Depends(get_current_user)):
    if addressee_id == user["id"]:
        raise HTTPException(status_code=400, detail="No puedes enviarte solicitud a ti mismo")
    
    target_user = sb_get_one("users", "id", addressee_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar si ya existe una relación
    existing = sb_query(
        supabase.table("friendships").select("*")
        .or_(f"and(requester_id.eq.{user['id']},addressee_id.eq.{addressee_id}),and(requester_id.eq.{addressee_id},addressee_id.eq.{user['id']})")
    )
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una solicitud")
    
    now = datetime.utcnow().isoformat() + "Z"
    friendship = sb_insert("friendships", {
        "requester_id": user["id"],
        "addressee_id": addressee_id,
        "status": "pending",
        "created_at": now
    })
    
    return {"message": "Solicitud enviada", "friendship": friendship}

@app.put(f"{API_PREFIX}/friends/respond/{{friendship_id}}")
def respond_friend_request(friendship_id: int, response: FriendRequestResponse, user: dict = Depends(get_current_user)):
    friendship = sb_get_one("friendships", "id", friendship_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if friendship["addressee_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No puedes responder esta solicitud")
    
    if friendship["status"] != "pending":
        raise HTTPException(status_code=400, detail="Solicitud ya respondida")
    
    new_status = "accepted" if response.accept else "rejected"
    sb_update("friendships", {"status": new_status}, "id", friendship_id)
    
    return {"message": f"Solicitud {'aceptada' if response.accept else 'rechazada'}"}

@app.get(f"{API_PREFIX}/friends")
def get_friends(user: dict = Depends(get_current_user)):
    # Obtener amigos aceptados
    res = supabase.table("friendships").select("""
        *,
        requester:requester_id(id, username, profile_image_url, bio),
        addressee:addressee_id(id, username, profile_image_url, bio)
    """).eq("status", "accepted").or_(f"requester_id.eq.{user['id']},addressee_id.eq.{user['id']}").execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    friendships = _res_data(res) or []
    friends = []
    
    for f in friendships:
        if f["requester_id"] == user["id"]:
            friends.append(f["addressee"])
        else:
            friends.append(f["requester"])
    
    return {"friends": friends}

@app.get(f"{API_PREFIX}/friends/requests")
def get_friend_requests(user: dict = Depends(get_current_user)):
    # Solicitudes recibidas pendientes
    res = supabase.table("friendships").select("""
        *,
        requester:requester_id(id, username, profile_image_url, bio)
    """).eq("addressee_id", user["id"]).eq("status", "pending").execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    requests = _res_data(res) or []
    return {"requests": requests}

@app.delete(f"{API_PREFIX}/friends/{{friendship_id}}")
def delete_friend(friendship_id: int, user: dict = Depends(get_current_user)):
    friendship = sb_get_one("friendships", "id", friendship_id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Amistad no encontrada")
    
    if friendship["requester_id"] != user["id"] and friendship["addressee_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    
    sb_delete("friendships", "id", friendship_id)
    return {"message": "Amistad eliminada"}

# === ENDPOINTS MESSAGES ===
@app.post(f"{API_PREFIX}/messages", status_code=201)
def send_message(data: MessageIn, user: dict = Depends(get_current_user)):
    if data.receiver_id == user["id"]:
        raise HTTPException(status_code=400, detail="No puedes enviarte mensajes a ti mismo")
    
    receiver = sb_get_one("users", "id", data.receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    now = datetime.utcnow().isoformat() + "Z"
    message = sb_insert("messages", {
        "sender_id": user["id"],
        "receiver_id": data.receiver_id,
        "content": data.content,
        "created_at": now
    })
    
    return {"message": "Mensaje enviado", "data": message}

@app.get(f"{API_PREFIX}/messages/conversation/{{other_user_id}}")
def get_conversation(other_user_id: int, user: dict = Depends(get_current_user)):
    res = supabase.table("messages").select("""
        *,
        sender:sender_id(id, username, profile_image_url),
        receiver:receiver_id(id, username, profile_image_url)
    """).or_(
        f"and(sender_id.eq.{user['id']},receiver_id.eq.{other_user_id}),and(sender_id.eq.{other_user_id},receiver_id.eq.{user['id']})"
    ).order("created_at", desc=False).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    messages = _res_data(res) or []
    
    # Marcar como leídos los mensajes recibidos
    supabase.table("messages").update({"is_read": True}).eq("receiver_id", user["id"]).eq("sender_id", other_user_id).eq("is_read", False).execute()
    
    return {"messages": messages}

@app.get(f"{API_PREFIX}/messages/conversations")
def get_conversations(user: dict = Depends(get_current_user)):
    # Obtener últimos mensajes de cada conversación
    res = supabase.table("messages").select("""
        *,
        sender:sender_id(id, username, profile_image_url),
        receiver:receiver_id(id, username, profile_image_url)
    """).or_(f"sender_id.eq.{user['id']},receiver_id.eq.{user['id']}").order("created_at", desc=True).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    messages = _res_data(res) or []
    
    # Agrupar por usuario
    conversations = {}
    for msg in messages:
        other_user_id = msg["receiver_id"] if msg["sender_id"] == user["id"] else msg["sender_id"]
        if other_user_id not in conversations:
            other_user = msg["receiver"] if msg["sender_id"] == user["id"] else msg["sender"]
            conversations[other_user_id] = {
                "user": other_user,
                "last_message": msg,
                "unread_count": 0
            }
    
    # Contar no leídos
    for conv_id in conversations:
        unread = supabase.table("messages").select("id", count="exact").eq("sender_id", conv_id).eq("receiver_id", user["id"]).eq("is_read", False).execute()
        conversations[conv_id]["unread_count"] = unread.count if hasattr(unread, 'count') else 0
    
    return {"conversations": list(conversations.values())}

# === ENDPOINTS POSTS ===
@app.get(f"{API_PREFIX}/posts")
def list_posts(
    category: Optional[str] = None,
    breaking: Optional[bool] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    query = supabase.table("posts").select("""
        *,
        author:author_id(id, username, profile_image_url)
    """)
    
    if category:
        query = query.eq("category", category)
    
    if breaking:
        query = query.eq("is_breaking_news", True)
    
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    posts = _res_data(res) or []
    return {"posts": posts}

@app.get(f"{API_PREFIX}/posts/breaking-news")
def get_breaking_news():
    """Noticias de última hora (últimas 24h)"""
    yesterday = (datetime.utcnow() - timedelta(hours=24)).isoformat() + "Z"
    
    res = supabase.table("posts").select("""
        *,
        author:author_id(id, username, profile_image_url)
    """).or_(f"is_breaking_news.eq.true,created_at.gte.{yesterday}").order("created_at", desc=True).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    posts = _res_data(res) or []
    return {"posts": posts}

@app.get(f"{API_PREFIX}/posts/search")
def search_posts(q: str = Query(..., min_length=2)):
    """Búsqueda de noticias"""
    res = supabase.table("posts").select("""
        *,
        author:author_id(id, username, profile_image_url)
    """).or_(f"title.ilike.%{q}%,content.ilike.%{q}%").order("created_at", desc=True).limit(50).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    posts = _res_data(res) or []
    return {"posts": posts}

@app.post(f"{API_PREFIX}/posts", status_code=201)
def create_post(payload: PostIn, user: dict = Depends(get_current_user)):
    # Solo editores y admins pueden crear posts
    if user.get("role") not in ["editor", "admin"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear noticias")
    
    now = datetime.utcnow().isoformat() + "Z"
    obj = {
        "title": payload.title,
        "content": payload.content,
        "category": payload.category,
        "author_id": user["id"],
        "tags": payload.tags or [],
        "image_url": payload.image_url,
        "is_breaking_news": payload.is_breaking_news,
        "reading_time": payload.reading_time,
        "created_at": now
    }
    created = sb_insert("posts", obj)
    return {"message": "Noticia creada", "post": created[0] if isinstance(created, list) and created else created}

@app.get(f"{API_PREFIX}/posts/{{post_id}}")
def get_post(post_id: int):
    res = supabase.table("posts").select("""
        *,
        author:author_id(id, username, profile_image_url)
    """).eq("id", post_id).limit(1).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    posts = _res_data(res) or []
    if not posts:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")
    
    return posts[0]

@app.put(f"{API_PREFIX}/posts/{{post_id}}")
def update_post(post_id: int, payload: PostUpdate, user: dict = Depends(get_current_user)):
    post = sb_get_one("posts", "id", post_id)
    if not post:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    # Solo el autor o admins pueden editar
    if post["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    update_data = {}
    if payload.title is not None:
        update_data["title"] = payload.title
    if payload.content is not None:
        update_data["content"] = payload.content
    if payload.category is not None:
        update_data["category"] = payload.category
    if payload.tags is not None:
        update_data["tags"] = payload.tags
    if payload.image_url is not None:
        update_data["image_url"] = payload.image_url
    if payload.is_breaking_news is not None:
        update_data["is_breaking_news"] = payload.is_breaking_news
    
    if update_data:
        sb_update("posts", update_data, "id", post_id)
    
    return {"message": "Actualizado"}

@app.delete(f"{API_PREFIX}/posts/{{post_id}}")
def delete_post(post_id: int, user: dict = Depends(get_current_user)):
    post = sb_get_one("posts", "id", post_id)
    if not post:
        raise HTTPException(status_code=404, detail="No encontrado")
    
    if post["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    sb_delete("posts", "id", post_id)
    return {"message": "Eliminado"}

# === ENDPOINTS COMMENTS ===
@app.post(f"{API_PREFIX}/posts/{{post_id}}/comments", status_code=201)
def create_comment(post_id: int, data: CommentIn, user: dict = Depends(get_current_user)):
    post = sb_get_one("posts", "id", post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    if data.parent_comment_id:
        parent = sb_get_one("comments", "id", data.parent_comment_id)
        if not parent or parent["post_id"] != post_id:
            raise HTTPException(status_code=400, detail="Comentario padre inválido")
    
    now = datetime.utcnow().isoformat() + "Z"
    comment = sb_insert("comments", {
        "post_id": post_id,
        "author_id": user["id"],
        "content": data.content,
        "parent_comment_id": data.parent_comment_id,
        "created_at": now
    })
    
    return {"message": "Comentario creado", "comment": comment}

@app.get(f"{API_PREFIX}/posts/{{post_id}}/comments")
def get_post_comments(post_id: int):
    res = supabase.table("comments").select("""
        *,
        author:author_id(id, username, profile_image_url)
    """).eq("post_id", post_id).order("created_at", desc=False).execute()
    
    if _res_error(res):
        raise HTTPException(status_code=500, detail="Error DB")
    
    comments = _res_data(res) or []
    return {"comments": comments}

@app.delete(f"{API_PREFIX}/comments/{{comment_id}}")
def delete_comment(comment_id: int, user: dict = Depends(get_current_user)):
    comment = sb_get_one("comments", "id", comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    
    if comment["author_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    sb_delete("comments", "id", comment_id)
    return {"message": "Comentario eliminado"}

# === HEALTH CHECK ===
@app.get("/health")
def health():
    return {"status": "ok", "service": "LaCebolla API"}
