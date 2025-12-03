import dotenv from 'dotenv';
dotenv.config();

const ENVIRONMENT = {
    MONGO_DB_CONNECTION_STRING: process.env.MONGO_DB_CONNECTION_STRING,
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,

    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || "onboarding@resend.dev",

    URL_API_BACKEND: process.env.URL_API_BACKEND,
    URL_FRONTEND: process.env.URL_FRONTEND
};

export default ENVIRONMENT;
