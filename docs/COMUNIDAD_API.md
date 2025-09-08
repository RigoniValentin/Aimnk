# Comunidad HOU API (guía para frontend)

Base URL de comunidad: `/api/v1/comunidad`

Autenticación: Header `Authorization: Bearer <token>` requerido en todos los endpoints de comunidad.

Formato éxito: `{ success: true, data: T, pagination?: {...} }`
Formato error: `{ success: false, message: string }`

Notas:

- Los listados aceptan `?page` y `?limit` y devuelven `pagination`.
- Subida de imágenes de post: `multipart/form-data` con campo `content` y `images` (0–4 archivos, jpg/png/gif/webp, máx 5MB).

---

## Configuración Axios

```ts
import axios from "axios";

export const api = axios.create({ baseURL: "/api/v1/comunidad" });
api.interceptors.request.use((cfg) => {
  cfg.headers = cfg.headers || {};
  cfg.headers.Authorization = `Bearer ${token}`; // Inserta JWT
  return cfg;
});
```

---

## Posts

### GET /posts/feed

- Query: `page?`, `limit?`
- Devuelve feed paginado de posts activos

```ts
const { data } = await api.get("/posts/feed", {
  params: { page: 1, limit: 20 },
});
// data: { success, data: Post[], pagination }
```

Respuesta ejemplo (parcial):

```json
{
  "success": true,
  "data": [
    {
      "_id": "664...",
      "content": "Hola #comunidad",
      "images": ["/uploads/social/images-...jpg"],
      "authorId": "663...",
      "likesCount": 5,
      "commentsCount": 2,
      "sharesCount": 1,
      "hashtags": ["comunidad"],
      "mentions": ["user123"],
      "isActive": true,
      "createdAt": "2025-08-28T10:30:00.000Z",
      "updatedAt": "2025-08-28T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### GET /posts/explore

Posts recientes (explorar)

```ts
const res = await api.get("/posts/explore", { params: { page: 1, limit: 20 } });
```

### GET /posts/hashtag/:tag

```ts
const res = await api.get(`/posts/hashtag/${encodeURIComponent(tag)}`, {
  params: { page: 1, limit: 20 },
});
```

### GET /posts/trending

Top por likes de los últimos 7 días

```ts
const res = await api.get("/posts/trending"); // data: Post[]
```

### POST /posts

Crear post con imágenes (multipart)

```ts
const form = new FormData();
form.append("content", content);
files.slice(0, 4).forEach((f) => form.append("images", f));
const res = await api.post("/posts", form, {
  headers: { "Content-Type": "multipart/form-data" },
});
// res.data: { success, data: Post }
```

### GET /posts/:id

```ts
const res = await api.get(`/posts/${postId}`);
```

### DELETE /posts/:id

```ts
await api.delete(`/posts/${postId}`);
// { success: true, data: true }
```

### POST /posts/:id/like

```ts
const res = await api.post(`/posts/${postId}/like`);
// { success: true, data: { liked: boolean, likesCount: number } }
```

### POST /posts/:id/bookmark

```ts
const res = await api.post(`/posts/${postId}/bookmark`);
// { success: true, data: { bookmarked: boolean } }
```

### POST /posts/:id/share

```ts
const res = await api.post(`/posts/${postId}/share`);
// { success: true, data: { ok: true } }
```

---

## Comments

### GET /posts/:postId/comments

```ts
const res = await api.get(`/posts/${postId}/comments`);
// { success, data: Comment[] }
```

### POST /comments

Crea comentario o reply (máx 3 niveles)

```ts
const res = await api.post("/comments", { postId, content, parentCommentId });
// { success, data: Comment }
```

### POST /comments/:id/like

```ts
const res = await api.post(`/comments/${commentId}/like`);
// { success: true, data: { liked: boolean } }
```

Estructura Comment (parcial):

```ts
{
  _id: string; content: string; authorId: string; postId: string;
  parentCommentId?: string; likesCount: number; repliesCount: number;
  mentions: string[]; isActive: boolean; createdAt: string; updatedAt: string;
}
```

---

## Follows

### GET /users/:id/followers

```ts
const res = await api.get(`/users/${userId}/followers`);
// { success, data: Follow[] }
```

### GET /users/:id/following

```ts
const res = await api.get(`/users/${userId}/following`);
```

### POST /users/:id/follow

```ts
const res = await api.post(`/users/${targetId}/follow`);
// { success, data: Follow }
```

### DELETE /users/:id/follow

```ts
await api.delete(`/users/${targetId}/follow`);
// { success: true, data: { ok: true } }
```

### GET /users/suggestions

```ts
const res = await api.get("/users/suggestions");
// { success, data: Array<{ username:string; name:string; avatar?:string; followersCount:number }> }
```

---

## Users (perfil y búsqueda)

### GET /users/me

```ts
const res = await api.get("/users/me");
// { success, data: User }
```

### PUT /users/me

```ts
const res = await api.put("/users/me", {
  name,
  bio,
  avatar,
  locality,
  nationality,
});
// { success, data: User }
```

### GET /users/:id

```ts
const res = await api.get(`/users/${userId}`);
```

### GET /users/:id/posts

```ts
const res = await api.get(`/users/${userId}/posts`, {
  params: { page: 1, limit: 20 },
});
// { success, data: Post[], pagination }
```

### GET /users/search

```ts
const res = await api.get("/users/search", { params: { q: "aimnk" } });
// { success, data: User[] }
```

Estructura User (subset, sin password):

```ts
{
  _id: string; name: string; username: string; email: string;
  avatar?: string; bio?: string; followersCount: number; followingCount: number;
  postsCount: number; isVerified: boolean; isActive: boolean; lastActive?: string;
}
```

---

## Notifications

### GET /notifications

```ts
const res = await api.get("/notifications", { params: { page: 1, limit: 20 } });
// { success, data: Notification[], pagination }
```

### PUT /notifications/:id/read

```ts
await api.put(`/notifications/${id}/read`);
// { success: true, data: { ok: true } }
```

### PUT /notifications/read-all

```ts
await api.put("/notifications/read-all");
// { success: true, data: { ok: true } }
```

Estructura Notification (parcial):

```ts
{
  _id: string; type: "like"|"comment"|"follow"|"mention"; message: string;
  fromUserId: string; toUserId: string; postId?: string; commentId?: string;
  isRead: boolean; createdAt: string;
}
```

---

## Tiempo real (Socket.io)

Unirse a sala privada del usuario para notificaciones en tiempo real:

```ts
import { io } from "socket.io-client";
const socket = io("/", { withCredentials: true });
socket.emit("join_user_room", userId);
```

Eventos previstos del servidor (a implementar en flows): `new_notification`, `post_liked`, `new_comment`.

---

## Tipos rápidos

Post:

```ts
{
  _id: string; content: string; images: string[]; authorId: string;
  likesCount: number; commentsCount: number; sharesCount: number;
  hashtags: string[]; mentions: string[]; isActive: boolean;
  createdAt: string; updatedAt: string;
}
```

Comment:

```ts
{
  _id: string; content: string; authorId: string; postId: string;
  parentCommentId?: string; likesCount: number; repliesCount: number;
  mentions: string[]; isActive: boolean; createdAt: string; updatedAt: string;
}
```

Follow:

```ts
{
  _id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}
```

Notification:

```ts
{
  _id: string; type: "like"|"comment"|"follow"|"mention"; message: string;
  fromUserId: string; toUserId: string; postId?: string; commentId?: string;
  isRead: boolean; createdAt: string;
}
```

---

Errores comunes:

- 401: token faltante o inválido
- 403: acción no permitida (p.ej. eliminar post ajeno)
- 400: validaciones (content vacío, archivo inválido, etc.)
