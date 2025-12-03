import { Resend } from "resend";
import ENVIRONMENT from "./environment.config.js";

const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
    try {
        console.log("📤 Enviando correo a:", to);

        const response = await resend.emails.send({
            from: `Ulises App <onboarding@resend.dev>`,
            to,
            subject,
            html
        });

        console.log("📨 Email enviado correctamente:", response);
        return response;

    } catch (error) {
        console.error("❌ ERROR EN RESEND:", error.message || error);
        throw error;
    }
};
