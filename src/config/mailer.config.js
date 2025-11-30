import { Resend } from 'resend';
import ENVIRONMENT from './environment.config.js';

const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const response = await resend.emails.send({
            from: ENVIRONMENT.EMAIL_FROM, // ejemplo: "Mi App <no-reply@miapp.com>"
            to,
            subject,
            html
        });

        return response;
    } catch (error) {
        console.error("Error enviando correo:", error);
        throw error;
    }
};