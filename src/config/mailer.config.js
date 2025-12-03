import { Resend } from 'resend';
import ENVIRONMENT from './environment.config.js';

// Inicializar cliente de Resend
const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {

        if (!ENVIRONMENT.RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY falta en el .env");
            throw new Error("RESEND_API_KEY no configurada");
        }

        const fromEmail = ENVIRONMENT.EMAIL_FROM || "onboarding@resend.dev";

        const response = await resend.emails.send({
            from: fromEmail,
            to,
            subject,
            html
        });

        return response;

    } catch (error) {
        console.error("❌ Error enviando correo:", error);

        if (error?.response) {
            console.error("📛 Resend error:", error.response);
        }

        throw error;
    }
};
