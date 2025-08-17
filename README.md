"# Aimnk Backend

## Descripción
Backend para la aplicación Aimnk - Sistema integral de gestión de estaciones, QnA y autenticación.

## Características principales
- ✅ Sistema de estaciones con múltiples endpoints
- ✅ Sistema QnA con administración
- ✅ Autenticación JWT
- ✅ CORS configurado para múltiples dominios
- ✅ Integración con MongoDB
- ✅ Pagos con MercadoPago
- ✅ Sistema de notificaciones por email

## Tecnologías
- **Backend**: Node.js + TypeScript + Express
- **Base de datos**: MongoDB + Mongoose
- **Autenticación**: JWT
- **Pagos**: MercadoPago
- **Email**: Nodemailer

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/RigoniValentin/Aimnk.git
cd Aimnk

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
npm start
```

## Variables de entorno requeridas

```env
PORT=3010
MONGODB_URI=mongodb://localhost:27017/aimnk
JWT_SECRET=tu_jwt_secret
MP_ACCESS_TOKEN=tu_mercadopago_token
SMTP_SERVICE=gmail
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password
FRONT_ORIGINS=https://tu-dominio.com
```

## API Endpoints

### Autenticación
- `POST /api/v1/auth/login` - Login de usuario
- `POST /api/v1/auth/register` - Registro de usuario
- `POST /api/v1/auth/forgot-password` - Recuperar contraseña

### Estaciones
- `GET /api/v1/stations/verdad` - Obtener datos de estación Verdad
- `PUT /api/v1/stations/verdad` - Actualizar estación Verdad
- `GET /api/v1/stations/summary` - Resumen de todas las estaciones

### QnA
- `GET /api/v1/qna` - Listar preguntas públicas
- `POST /api/v1/qna` - Crear pregunta (usuario autenticado)
- `GET /api/v1/qna/admin/pending` - Preguntas pendientes (admin)
- `POST /api/v1/qna/admin/answer/:id` - Responder pregunta (admin)

## Estructura del proyecto

```
src/
├── controllers/     # Controladores de rutas
├── models/         # Modelos de MongoDB
├── routes/         # Definición de rutas
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos
├── middlewares/    # Middlewares personalizados
├── types/          # Definiciones TypeScript
└── config/         # Configuraciones
```

## Licencia
ISC" 
