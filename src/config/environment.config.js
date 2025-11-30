import dotenv from 'dotenv';
// Carga todas las variables de entorno dentro de process.env
dotenv.config();

// Creamos una constante de fácil acceso a mis variables de entorno
const ENVIRONMENT = {
    MONGO_DB_CONNECTION_STRING: process.env.MONGO_DB_CONNECTION_STRING,
    GMAIL_PASSWORD: process.env.GMAIL_PASSWORD, // opcional, ya no se usa
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,

    // Nuevas variables para envío de correo con Resend
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,

    // URLs necesarias para armar los links de verificación
    URL_API_BACKEND: process.env.URL_API_BACKEND,   // (tu backend en Render)
    URL_FRONTEND: process.env.URL_FRONTEND          // (tu frontend en Vercel)
};

export default ENVIRONMENT;