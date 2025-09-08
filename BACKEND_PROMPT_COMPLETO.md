# 🚀 PROMPT COMPLETO: Backend de Red Social - Comunidad HOU

## 📋 DESCRIPCIÓN DEL PROYECTO

Necesito implementar un backend completo para una red social estilo Twitter/Instagram llamada "Comunidad HOU". El frontend ya está desarrollado en React + TypeScript y necesito que me implementes toda la arquitectura backend con las siguientes especificaciones:

---

## 🏗️ STACK TECNOLÓGICO REQUERIDO

### **Backend Framework:**

- **Node.js** con **Express.js** o **Fastify**
- **TypeScript** para tipado estricto
- **Prisma** como ORM (preferido) o **Mongoose** si usas MongoDB

### **Base de Datos:**

- **PostgreSQL** (preferido) o **MongoDB**
- **Redis** para caché y sesiones

### **Adicionales:**

- **Multer** o **Cloudinary** para manejo de archivos
- **Socket.io** para funcionalidades en tiempo real (notificaciones)
- **JWT** para autenticación
- **bcrypt** para hashing de passwords
- **Joi** o **Zod** para validación
- **rate-limiter** para protección contra spam

---

## 📊 MODELOS DE BASE DE DATOS

### **1. User (Usuario)**

```typescript
interface User {
  id: string; // UUID
  username: string; // único, 3-30 caracteres
  name: string; // nombre completo
  email: string; // único, validado
  passwordHash: string; // bcrypt hash
  avatar?: string; // URL de imagen
  bio?: string; // máximo 500 caracteres
  followersCount: number; // default 0
  followingCount: number; // default 0
  postsCount: number; // default 0
  isVerified: boolean; // default false
  isActive: boolean; // default true
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### **2. Post (Publicación)**

```typescript
interface Post {
  id: string; // UUID
  content: string; // 1-500 caracteres
  images: string[]; // array de URLs, máximo 4
  authorId: string; // FK a User
  likesCount: number; // default 0
  commentsCount: number; // default 0
  sharesCount: number; // default 0
  hashtags: string[]; // extraídos del contenido
  mentions: string[]; // usernames mencionados
  isActive: boolean; // default true
  createdAt: Date;
  updatedAt: Date;
}
```

### **3. Comment (Comentario)**

```typescript
interface Comment {
  id: string; // UUID
  content: string; // 1-500 caracteres
  authorId: string; // FK a User
  postId: string; // FK a Post
  parentCommentId?: string; // FK a Comment (para respuestas)
  likesCount: number; // default 0
  repliesCount: number; // default 0
  mentions: string[]; // usernames mencionados
  isActive: boolean; // default true
  createdAt: Date;
  updatedAt: Date;
}
```

### **4. Like (Me Gusta)**

```typescript
interface Like {
  id: string; // UUID
  userId: string; // FK a User
  targetType: "post" | "comment"; // tipo de objetivo
  targetId: string; // ID del post o comment
  createdAt: Date;
}
```

### **5. Follow (Seguimiento)**

```typescript
interface Follow {
  id: string; // UUID
  followerId: string; // FK a User (quien sigue)
  followingId: string; // FK a User (a quien sigue)
  createdAt: Date;
}
```

### **6. Bookmark (Guardado)**

```typescript
interface Bookmark {
  id: string; // UUID
  userId: string; // FK a User
  postId: string; // FK a Post
  createdAt: Date;
}
```

### **7. Notification (Notificación)**

```typescript
interface Notification {
  id: string; // UUID
  type: "like" | "comment" | "follow" | "mention";
  message: string; // mensaje personalizado
  fromUserId: string; // FK a User (quien genera)
  toUserId: string; // FK a User (quien recibe)
  postId?: string; // FK a Post (opcional)
  commentId?: string; // FK a Comment (opcional)
  isRead: boolean; // default false
  createdAt: Date;
}
```

---

## 🌐 ENDPOINTS DE API REQUERIDOS

### **🔐 AUTENTICACIÓN**

```
POST   /api/v1/auth/register          # Registro de usuario
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/logout            # Logout
POST   /api/v1/auth/refresh           # Refrescar token
POST   /api/v1/auth/forgot-password   # Recuperar contraseña
POST   /api/v1/auth/reset-password    # Resetear contraseña
```

### **👤 USUARIOS**

```
GET    /api/v1/comunidad/users/me                    # Usuario actual
PUT    /api/v1/comunidad/users/me                    # Actualizar perfil
GET    /api/v1/comunidad/users/:id                   # Perfil de usuario
GET    /api/v1/comunidad/users/:id/posts             # Posts de usuario
GET    /api/v1/comunidad/users/:id/followers         # Seguidores
GET    /api/v1/comunidad/users/:id/following         # Siguiendo
POST   /api/v1/comunidad/users/:id/follow            # Seguir usuario
DELETE /api/v1/comunidad/users/:id/follow            # Dejar de seguir
GET    /api/v1/comunidad/users/suggestions           # Sugerencias
GET    /api/v1/comunidad/users/search                # Buscar usuarios
```

### **📝 PUBLICACIONES**

```
GET    /api/v1/comunidad/posts/feed                  # Feed personalizado
GET    /api/v1/comunidad/posts/explore               # Explorar posts
POST   /api/v1/comunidad/posts                       # Crear post
GET    /api/v1/comunidad/posts/:id                   # Obtener post
PUT    /api/v1/comunidad/posts/:id                   # Editar post
DELETE /api/v1/comunidad/posts/:id                   # Eliminar post
POST   /api/v1/comunidad/posts/:id/like              # Like/unlike
POST   /api/v1/comunidad/posts/:id/bookmark          # Bookmark/unbookmark
POST   /api/v1/comunidad/posts/:id/share             # Compartir
GET    /api/v1/comunidad/posts/hashtag/:tag          # Posts por hashtag
```

### **💬 COMENTARIOS**

```
GET    /api/v1/comunidad/posts/:postId/comments      # Comentarios de post
POST   /api/v1/comunidad/comments                    # Crear comentario
GET    /api/v1/comunidad/comments/:id/replies        # Respuestas a comentario
PUT    /api/v1/comunidad/comments/:id                # Editar comentario
DELETE /api/v1/comunidad/comments/:id                # Eliminar comentario
POST   /api/v1/comunidad/comments/:id/like           # Like/unlike comentario
```

### **🔔 NOTIFICACIONES**

```
GET    /api/v1/comunidad/notifications               # Obtener notificaciones
PUT    /api/v1/comunidad/notifications/:id/read      # Marcar como leída
PUT    /api/v1/comunidad/notifications/read-all      # Marcar todas como leídas
DELETE /api/v1/comunidad/notifications/:id           # Eliminar notificación
```

### **🔍 BÚSQUEDA Y EXPLORAR**

```
GET    /api/v1/comunidad/search                      # Búsqueda general
GET    /api/v1/comunidad/hashtags/trending           # Hashtags trending
GET    /api/v1/comunidad/posts/trending              # Posts trending
```

### **📁 ARCHIVOS**

```
POST   /api/v1/upload/avatar                         # Subir avatar
POST   /api/v1/upload/post-images                    # Subir imágenes de post
```

---

## 📋 FUNCIONALIDADES ESPECÍFICAS REQUERIDAS

### **🔄 SISTEMA DE RESPUESTAS EN COMENTARIOS**

- Comentarios anidados hasta **3 niveles de profundidad**
- Al responder, auto-llenar con `@username` del comentario padre
- Conteo automático de respuestas por comentario
- API que retorne estructura jerárquica de comentarios

### **👤 SISTEMA DE MENCIONES**

- Detectar menciones `@username` en posts y comentarios
- Crear notificaciones automáticas para usuarios mencionados
- Validar que los usuarios mencionados existan
- Formato de respuesta que incluya menciones procesadas

### **📊 FEED INTELIGENTE**

- Algoritmo que priorice:
  1. Posts de usuarios seguidos (70%)
  2. Posts trending por hashtags de interés (20%)
  3. Posts sugeridos por engagement (10%)
- Paginación eficiente con cursor-based pagination
- Caché de feed en Redis por usuario

### **🔔 SISTEMA DE NOTIFICACIONES**

- Notificaciones en tiempo real con Socket.io
- Tipos: likes, comentarios, seguidores nuevos, menciones
- Rate limiting para evitar spam
- Cleanup automático de notificaciones antiguas (>30 días)

### **📈 CONTADORES Y ESTADÍSTICAS**

- Actualización automática de contadores (likes, comments, follows)
- Uso de transacciones para mantener consistencia
- Contadores desnormalizados para performance
- Recálculo periódico para verificar integridad

---

## 🛡️ MIDDLEWARE Y SEGURIDAD

### **Middleware Requeridos:**

```typescript
// 1. Autenticación JWT
authenticateToken(req, res, next)

// 2. Rate Limiting
rateLimiter({
  posts: 10/hora,
  comments: 30/hora,
  likes: 100/hora,
  follows: 20/hora
})

// 3. Validación de datos
validateSchema(schema)

// 4. Sanitización de contenido
sanitizeContent(field)

// 5. Upload de archivos
multerConfig({
  maxSize: 5MB,
  allowedTypes: ['jpg', 'png', 'gif', 'webp']
})
```

### **Validaciones Específicas:**

```typescript
// Posts
{
  content: "string, 1-500 chars, required",
  images: "array, max 4 items, optional"
}

// Comentarios
{
  content: "string, 1-500 chars, required",
  postId: "UUID, required",
  parentCommentId: "UUID, optional"
}

// Username
{
  pattern: /^[a-zA-Z0-9_]{3,30}$/,
  reserved: ['admin', 'api', 'www', 'help', etc.]
}
```

---

## 📱 RESPUESTAS DE API ESTANDARIZADAS

### **Formato de Respuesta Exitosa:**

```typescript
{
  success: true,
  data: T,
  message?: string,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  }
}
```

### **Formato de Error:**

```typescript
{
  success: false,
  message: string,
  errors?: string[],
  code?: string
}
```

### **Ejemplo de Post con Relaciones:**

```typescript
{
  success: true,
  data: {
    id: "uuid",
    content: "¡Hola comunidad! #autodescubrimiento",
    images: ["url1", "url2"],
    author: {
      id: "uuid",
      username: "aimnk_herak",
      name: "Aimnk Herak",
      avatar: "url"
    },
    likes: 25,
    comments: 8,
    shares: 3,
    isLiked: false,
    isBookmarked: true,
    createdAt: "2025-08-28T10:30:00Z",
    updatedAt: "2025-08-28T10:30:00Z"
  }
}
```

---

## 🚀 FUNCIONALIDADES TIEMPO REAL

### **Socket.io Events:**

```typescript
// Cliente → Servidor
"join_user_room"; // Unirse a sala de usuario
"join_post_room"; // Unirse a sala de post
"leave_room"; // Salir de sala

// Servidor → Cliente
"new_notification"; // Nueva notificación
"post_liked"; // Post recibió like
"new_comment"; // Nuevo comentario
"user_online"; // Usuario se conectó
"user_offline"; // Usuario se desconectó
```

---

## 📊 OPTIMIZACIONES DE PERFORMANCE

### **Base de Datos:**

- Índices en campos frecuentemente consultados
- Paginación cursor-based para feeds
- Agregaciones para contadores
- Cleanup jobs para datos antiguos

### **Caché (Redis):**

```typescript
// Patrones de caché
user:{userId}:profile      // Perfil de usuario (TTL: 1h)
user:{userId}:feed         // Feed personalizado (TTL: 15min)
post:{postId}:comments     // Comentarios de post (TTL: 5min)
hashtag:trending           // Hashtags trending (TTL: 30min)
user:{userId}:notifications // Notificaciones no leídas (TTL: 1h)
```

### **Archivos:**

- Subida directa a Cloudinary o AWS S3
- Compresión automática de imágenes
- Múltiples tamaños (thumbnail, medium, full)
- CDN para servir assets

---

## 🧪 TESTING REQUERIDO

### **Tests Unitarios:**

- Funciones de validación
- Helpers y utilidades
- Lógica de negocio

### **Tests de Integración:**

- Endpoints de API
- Operaciones de base de datos
- Autenticación y autorización

### **Tests E2E:**

- Flujos completos de usuario
- Creación de post → comentario → like
- Sistema de seguimiento

---

## 📝 ESTRUCTURA DE PROYECTO SUGERIDA

```
backend/
├── src/
│   ├── controllers/          # Controladores de rutas
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── posts.controller.ts
│   │   ├── comments.controller.ts
│   │   └── notifications.controller.ts
│   ├── middleware/           # Middleware personalizado
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── models/              # Modelos de Prisma/Mongoose
│   ├── routes/              # Definición de rutas
│   ├── services/            # Lógica de negocio
│   ├── utils/               # Utilidades y helpers
│   ├── types/               # Tipos TypeScript
│   ├── config/              # Configuración
│   └── app.ts               # Aplicación principal
├── prisma/                  # Esquemas y migraciones
├── tests/                   # Tests
└── uploads/                 # Archivos temporales
```

---

## 🎯 DELIVERABLES ESPERADOS

### **1. Código Completo:**

- Todos los endpoints funcionales
- Middleware configurado
- Validaciones implementadas
- Manejo de errores robusto

### **2. Base de Datos:**

- Schema/migraciones completas
- Seeds para datos de prueba
- Índices optimizados

### **3. Documentación:**

- README con instrucciones de setup
- Documentación de API (Swagger/OpenAPI)
- Ejemplos de uso

### **4. Configuración:**

- Variables de entorno
- Docker/docker-compose
- Scripts de deployment

---

## ⚡ REQUERIMIENTOS TÉCNICOS ADICIONALES

### **Performance:**

- Rate limiting implementado
- Caché estratégico
- Paginación eficiente
- Índices de BD optimizados

### **Seguridad:**

- Validación/sanitización de inputs
- Protección contra SQL injection
- Rate limiting contra spam
- Headers de seguridad

### **Escalabilidad:**

- Código modular y testeable
- Patrones de diseño apropiados
- Preparado para microservicios
- Logging estructurado

---

## 🚀 PROMPT DE EJECUCIÓN

**"Implementa un backend completo de red social con Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis siguiendo todas las especificaciones detalladas arriba. Incluye toda la lógica de negocio, endpoints, middleware, validaciones, sistema de comentarios con respuestas anidadas, menciones automáticas, notificaciones en tiempo real, sistema de seguimiento, y optimizaciones de performance. Proporciona código completo, funcional y listo para producción."**

---

¿Necesitas que ajuste alguna especificación o que agregue más detalles a alguna sección específica?
