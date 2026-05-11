# 🔔 Push Notifications Setup

Este documento explica cómo configurar las notificaciones push en el backend de AIMNK.

## 📋 Requisitos

- Node.js y npm instalados
- Servidor web con HTTPS (las push notifications requieren HTTPS)
- Claves VAPID generadas

## 🔑 Generar Claves VAPID

Las claves VAPID son necesarias para identificar tu servidor ante los servicios de push notification.

```bash
# Generar nuevas claves VAPID
node generate-vapid-keys.js
```

Este comando generará:

- `VAPID_PUBLIC_KEY`: Clave pública (se puede compartir con el frontend)
- `VAPID_PRIVATE_KEY`: Clave privada (mantener secreta)
- `VAPID_SUBJECT`: Email de contacto (debe ser un email válido)

## ⚙️ Configuración de Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Push Notifications Configuration
PUSH_NOTIFICATIONS_ENABLED=true
VAPID_PUBLIC_KEY=tu_clave_publica_aqui
VAPID_PRIVATE_KEY=tu_clave_privada_aqui
VAPID_SUBJECT=mailto:admin@tudominio.com
```

## 🚀 Despliegue

1. **Generar claves** (solo la primera vez):

   ```bash
   node generate-vapid-keys.js
   ```

2. **Configurar variables de entorno** en tu servidor

3. **Reiniciar la aplicación**:

   ```bash
   pm2 restart tu-app
   ```

4. **Verificar funcionamiento**:
   ```bash
   pm2 logs tu-app | grep "Push"
   ```

## 🧪 Testing

Usa los endpoints de test para verificar el funcionamiento:

```bash
# Test básico de push notifications
POST /api/v1/push/test
Authorization: Bearer tu-jwt-token

# Test de notificación social
POST /api/v1/push/test-social
Authorization: Bearer tu-jwt-token
```

## 🔒 Seguridad

- ✅ **HTTPS obligatorio**: Las push notifications solo funcionan con HTTPS
- ✅ **Claves privadas**: Nunca subas las claves privadas al repositorio
- ✅ **Variables de entorno**: Usa archivos `.env` para las configuraciones sensibles
- ✅ **Email válido**: El `VAPID_SUBJECT` debe ser un email válido de tu dominio

## 🐛 Troubleshooting

### Push notifications no llegan

1. **Verificar logs**:

   ```bash
   pm2 logs tu-app | grep -i push
   ```

2. **Verificar variables de entorno**:

   - `PUSH_NOTIFICATIONS_ENABLED=true`
   - Claves VAPID válidas
   - Email válido en `VAPID_SUBJECT`

3. **Verificar HTTPS**:
   - Las push notifications requieren HTTPS en producción
   - En desarrollo local, HTTP está permitido

### Service Worker no se registra

1. **Verificar HTTPS** en producción
2. **Verificar ruta del Service Worker** (`/sw.js`)
3. **Revisar consola del navegador** para errores

### Usuario no recibe notificaciones

1. **Verificar suscripción activa**:

   ```bash
   GET /api/v1/push/subscriptions
   ```

2. **Verificar preferencias de usuario**:
   - El usuario debe haber aceptado las notificaciones
   - Las preferencias deben permitir el tipo de notificación

## 📚 Referencias

- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [VAPID Specification](https://tools.ietf.org/html/draft-thomson-webpush-vapid)
- [Push API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
