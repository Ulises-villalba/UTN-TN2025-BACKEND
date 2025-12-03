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

        console.log("📩 Iniciando proceso de registro...");
        console.log("➡️ Email recibido:", email);
        console.log("➡️ Username:", username);

        // Mostrar si las ENV están presentes
        console.log("🔧 ENVIRONMENT CHECK:");
        console.log("RESEND_API_KEY:", ENVIRONMENT.RESEND_API_KEY ? "OK" : "❌ MISSING");
        console.log("EMAIL_FROM:", ENVIRONMENT.EMAIL_FROM || "❌ MISSING");
        console.log("URL_FRONTEND:", ENVIRONMENT.URL_FRONTEND || "❌ MISSING");
        console.log("URL_API_BACKEND:", ENVIRONMENT.URL_API_BACKEND || "❌ MISSING");
        console.log("---------------------------------------------");

        // 1. Verificar si el usuario existe
        const user_found = await UserRepository.getByEmail(email);
        if (user_found) {
            console.log("❌ Registro detenido: email ya existe");
            throw new ServerError(400, 'Email ya en uso');
        }

        // 2. Hashear contraseña
        const password_hashed = await bcrypt.hash(password, 12);

        // 3. Guardar usuario
        const user_created = await UserRepository.createUser(username, email, password_hashed);
        console.log("📝 Usuario creado en BD con ID:", user_created._id);

        // 4. Crear token de verificación
        const verification_token = jwt.sign(
            { email, user_id: user_created._id },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        // 5. Link al frontend
        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${verification_token}`;

        console.log("🔗 Link de verificación generado:");
        console.log(verification_link);

        // 6. Enviar email
        console.log("📤 Enviando email de verificación a:", email);

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

            console.log("✅ Email enviado correctamente");
            console.log("📨 Resultado Resend:", result);

        } catch (err) {
            console.error("❌ ERROR enviando mail de verificación:", err);

            if (err?.response) {
                console.error("📛 Detalles del error (Resend response):", err.response);
            }

            throw new ServerError(500, "No se pudo enviar el correo de verificación");
        }

        return user_created;
    }

    static async verifyEmail(verification_token) {
        try {
            console.log("🔍 Verificando token…");
            const payload = jwt.verify(verification_token, ENVIRONMENT.JWT_SECRET_KEY);

            await UserRepository.updateById(payload.user_id, {
                verified_email: true
            });

            console.log("✅ Email verificado para usuario:", payload.user_id);
            return;
        }
        catch (error) {
            console.error("❌ Token inválido:", error);

            if (error instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, 'Token invalido');
            }
            throw error;
        }
    }

    static async login(email, password) {
        const user = await UserRepository.getByEmail(email);
        if (!user) {
            console.log("❌ Login: email no encontrado");
            throw new ServerError(404, 'Email no registrado');
        }

        if (!user.verified_email) {
            console.log("❌ Login: email no verificado");
            throw new ServerError(401, 'Email no verificado. Revisa tu correo o solicita reenvío.');
        }

        const is_same_password = await bcrypt.compare(password, user.password);
        if (!is_same_password) {
            console.log("❌ Login: contraseña incorrecta");
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

        console.log("🔓 Login exitoso para:", email);

        return { authorization_token };
    }

    static async resendVerification(email) {
        console.log("🔄 Reenviando verificación a:", email);

        const user = await UserRepository.getByEmail(email);
        if (!user) {
            throw new ServerError(404, 'Email no registrado');
        }
        if (user.verified_email) {
            throw new ServerError(400, 'Email ya verificado');
        }

        const token = jwt.sign(
            { email: user.email, user_id: user._id },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${token}`;

        console.log("🔗 Nuevo link de verificación:", verification_link);

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

            console.log("📨 Reenvío exitoso");
            console.log("Resultado Resend:", result);

        } catch (err) {
            console.error("❌ ERROR reenviando mail:", err);
            if (err.response) console.error("Detalles:", err.response);
            throw new ServerError(500, "No se pudo reenviar el correo de verificación");
        }

        return { message: "Correo de verificación reenviado" };
    }
}

export default AuthService;