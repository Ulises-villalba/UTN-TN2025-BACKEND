import { Resend } from 'resend';
import ENVIRONMENT from './environment.config.js';

const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const response = await resend.emails.send({
            from: "Ulises App <onboarding@resend.dev>", // ← ESTA ES LA CLAVE
            to,
            subject,
            html
        });

        console.log("📨 Resultado Resend:", response);
        return response;

    } catch (error) {
        console.error("❌ Error enviando correo:", error);
        throw error; // ← Importante: no ocultar el error
    }
};
