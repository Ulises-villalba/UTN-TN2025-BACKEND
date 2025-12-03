import UserRepository from "../repositories/user.repository.js";
import { ServerError } from "../utils/customError.utils.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ENVIRONMENT from "../config/environment.config.js";
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(ENVIRONMENT.RESEND_API_KEY);

class AuthService {

    // 🔐 ------------------------------------------
    // FUNCIÓN INTERNA: enviar email de verificación
    // ----------------------------------------------
    static async _sendVerificationEmail(username, email, user_id) {

        const token = jwt.sign(
            { email, user_id },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${token}`;

        console.log("📤 Enviando email de verificación a:", email);

        const result = await resend.emails.send({
            from: `"Mi App" <${ENVIRONMENT.EMAIL_FROM}>`,
            to: email,
            subject: "Verificación de correo electrónico",
            html: `
                <h1>Hola ${username}</h1>
                <p>Haz clic para verificar tu correo:</p>
                <p><a href="${verification_link}" style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;">Verificar email</a></p>
                <p>Si no funciona, usa este enlace:</p>
                <p>${verification_link}</p>
            `
        });

        console.log("📨 Resend:", result);

        return { message: "Email enviado", already_registered: true };
    }

    // 📝 ------------------------------------------
    // REGISTER — ahora reenvía mail si ya existe
    // ----------------------------------------------
    static async register(username, password, email) {

        console.log("📩 Iniciando proceso de registro...");
        console.log("➡️ Email recibido:", email);
        console.log("➡️ Username:", username);

        // 1. Verificar si el usuario existe
        const user_found = await UserRepository.getByEmail(email);

        if (user_found) {

            // 🟡 usuario existe pero NO verificado → reenviar mail automáticamente
            if (!user_found.verified_email) {
                console.log("📬 Usuario ya existe pero NO verificado → reenviando email…");
                return await AuthService._sendVerificationEmail(
                    user_found.username,
                    user_found.email,
                    user_found._id
                );
            }

            // 🔴 si existe y está verificado → error
            console.log("❌ Registro detenido: email ya existe y está verificado");
            throw new ServerError(400, 'Email ya en uso');
        }

        // 2. Hashear contraseña
        const password_hashed = await bcrypt.hash(password, 12);

        // 3. Guardar usuario
        const new_user = await UserRepository.createUser(username, email, password_hashed);
        console.log("📝 Usuario creado:", new_user._id);

        // 4. Enviar mail de verificación
        await AuthService._sendVerificationEmail(username, email, new_user._id);

        return new_user;
    }

    // ----------------------------------------------
    static async verifyEmail(verification_token) {
        try {

            const payload = jwt.verify(verification_token, ENVIRONMENT.JWT_SECRET_KEY);

            await UserRepository.updateById(payload.user_id, {
                verified_email: true
            });

            console.log("✅ Email verificado:", payload.user_id);
            return;

        } catch (error) {
            console.error("❌ Token inválido:", error);

            if (error instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, 'Token invalido');
            }
            throw error;
        }
    }

    // ----------------------------------------------
    static async login(email, password) {

        const user = await UserRepository.getByEmail(email);
        if (!user) throw new ServerError(404, 'Email no registrado');

        if (!user.verified_email)
            throw new ServerError(401, 'Email no verificado. Revisa tu correo.');

        const is_same_password = await bcrypt.compare(password, user.password);
        if (!is_same_password)
            throw new ServerError(401, 'Contraseña incorrecta');

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        console.log("🔓 Login exitoso:", email);
        return { authorization_token: token };
    }

    // ----------------------------------------------
    static async resendVerification(email) {

        const user = await UserRepository.getByEmail(email);
        if (!user) throw new ServerError(404, 'Email no registrado');
        if (user.verified_email) throw new ServerError(400, 'Email ya verificado');

        return await AuthService._sendVerificationEmail(
            user.username,
            user.email,
            user._id
        );
    }
}

export default AuthService;