import nodemailer from 'nodemailer';
import ENVIRONMENT from './environment.config.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ENVIRONMENT.GMAIL_USERNAME,
        pass: ENVIRONMENT.GMAIL_APP_PASSWORD
    }
});

export const sendEmail = async ({ to, subject, html }) => {
    try {
        const info = await transporter.sendMail({
            from: ENVIRONMENT.EMAIL_FROM,
            to,
            subject,
            html
        });
        console.log("📨 Email enviado correctamente:", info.response);
        return info;
    } catch (error) {
        console.error("❌ Error enviando correo:", error);
        throw error;
    }
};
