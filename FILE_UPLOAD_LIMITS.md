# 📸 Aumentar Límites de Tamaño para Subida de Imágenes

## 🎯 Problema Resuelto

Error `413 (Content Too Large)` al subir imágenes de perfil y portada.

## 🔧 Cambios Realizados

### 1. **Express Server Configuration** (`server.ts`)

```typescript
// ANTES
app.use(express.json());

// DESPUÉS
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

### 2. **Multer Upload Middleware** (`upload.ts`)

```typescript
// ANTES
export const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadAvatar = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export const uploadCover = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// DESPUÉS
export const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const uploadAvatar = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

export const uploadCover = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});
```

### 3. **Routes Configuration** (`routes.ts`)

```typescript
// Usar middlewares específicos para cada tipo de archivo
router.post(
  "/users/upload-avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  uploadUserAvatar
);
router.post(
  "/users/upload-cover",
  verifyToken,
  uploadCover.single("cover"),
  uploadUserCover
);
```

## 📊 Nuevos Límites

| Tipo de Archivo | Límite Anterior | Límite Nuevo | Mejora |
| --------------- | --------------- | ------------ | ------ |
| **Avatares**    | 5MB             | 25MB         | 5x     |
| **Portadas**    | 10MB            | 50MB         | 5x     |
| **Posts**       | 5MB             | 25MB         | 5x     |
| **General**     | Sin límite      | 50MB         | ✅     |

## 🚀 Resultado Esperado

✅ **Antes**: Error 413 con imágenes > 5MB  
✅ **Ahora**: Subida exitosa de imágenes hasta 25MB (avatares) y 50MB (portadas)

## 📝 Notas Técnicas

- **Express**: Configurado para manejar payloads JSON/form hasta 50MB
- **Multer**: Límites específicos por tipo de archivo
- **Middleware**: Usa `uploadAvatar` y `uploadCover` especializados
- **Compatibilidad**: Mantiene soporte para rutas directas y de SER

## ⚠️ Consideraciones

- Archivos más grandes = más tiempo de subida
- Monitorear uso de ancho de banda y storage
- Considerar compresión de imágenes en el frontend
