import UserRepository from "../repositories/user.repository.js";
import { ServerError } from "../utils/customError.utils.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ENVIRONMENT from "../config/environment.config.js";
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

class AuthService {

    static async register(username, password, email) {

        // 1. Verificar si el usuario existe
        const user_found = await UserRepository.getByEmail(email);
        if (user_found) {
            throw new ServerError(400, 'Email ya en uso');
        }

        // 2. Hashear contraseña
        const password_hashed = await bcrypt.hash(password, 12);

        // 3. Guardar usuario
        const user_created = await UserRepository.createUser(username, email, password_hashed);

        // 4. Crear token de verificación
        const verification_token = jwt.sign(
            {
                email: email,
                user_id: user_created._id
            },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        // 5. Generar link de verificación apuntando al frontend
        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${verification_token}`;

        // 6. Enviar email con Resend con manejo de errores y logs
        try {
            const result = await resend.emails.send({
                from: `"Mi App" <${ENVIRONMENT.EMAIL_FROM}>`,
                to: email,
                subject: "Verificación de correo electrónico",
                html: `
                    <h1>Hola ${username}</h1>
                    <p>Gracias por registrarte. Haz clic en el botón para verificar tu correo:</p>
                    <p><a href="${verification_link}" style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;">Verificar email</a></p>
                    <p>Si no funciona, usa este enlace:</p>
                    <p>${verification_link}</p>
                `
            });
            console.log("Correo de verificación enviado a", email);
            console.log("Resultado Resend:", result);
        } catch (err) {
            console.error("Error enviando correo de verificación:", err);
            if (err.response) console.error("Detalles del error Resend:", err.response);
            throw new ServerError(500, "No se pudo enviar el correo de verificación");
        }

        return user_created;
    }

    static async verifyEmail(verification_token) {
        try {
            const payload = jwt.verify(verification_token, ENVIRONMENT.JWT_SECRET_KEY);

            await UserRepository.updateById(payload.user_id, {
                verified_email: true
            });

            return;
        }
        catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, 'Token invalido');
            }
            throw error;
        }
    }

    static async login(email, password) {
        const user = await UserRepository.getByEmail(email);
        if (!user) {
            throw new ServerError(404, 'Email no registrado');
        }

        if (!user.verified_email) {
            throw new ServerError(401, 'Email no verificado. Revisa tu correo o solicita reenvío.');
        }

        const is_same_password = await bcrypt.compare(password, user.password);
        if (!is_same_password) {
            throw new ServerError(401, 'Contraseña incorrecta');
        }

        const authorization_token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                created_at: user.created_at
            },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        return { authorization_token };
    }

    static async resendVerification(email) {
        const user = await UserRepository.getByEmail(email);

        if (!user) {
            throw new ServerError(404, 'Email no registrado');
        }
        if (user.verified_email) {
            throw new ServerError(400, 'Email ya verificado');
        }

        const token = jwt.sign(
            {
                email: user.email,
                user_id: user._id
            },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${token}`;

        try {
            const result = await resend.emails.send({
                from: `"Mi App" <${ENVIRONMENT.EMAIL_FROM}>`,
                to: email,
                subject: "Reenvío de verificación de correo",
                html: `
                    <h1>Verifica tu correo</h1>
                    <p>Haz clic aquí para verificarlo:</p>
                    <a href="${verification_link}" style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;">Verificar email</a>
                    <p>Si no funciona, usa este enlace:</p>
                    <p>${verification_link}</p>
                `
            });
            console.log("Correo de verificación reenviado a", email);
            console.log("Resultado Resend:", result);
        } catch (err) {
            console.error("Error reenviando correo de verificación:", err);
            if (err.response) console.error("Detalles del error Resend:", err.response);
            throw new ServerError(500, "No se pudo reenviar el correo de verificación");
        }

        return { message: "Correo de verificación reenviado" };
    }
}

export default AuthService;