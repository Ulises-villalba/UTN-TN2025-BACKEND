import UserRepository from "../repositories/user.repository.js";
import { ServerError } from "../utils/customError.utils.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ENVIRONMENT from "../config/environment.config.js";
import { sendEmail } from "../config/mailer.config.js";

class AuthService {

    // 🔐 Envío centralizado de email con retry
    static async _sendVerificationEmail(username, email, user_id) {

        const token = jwt.sign(
            { email, user_id },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        const verification_link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${token}`;

        const html = `
            <h1>Hola ${username}</h1>
            <p>Haz clic para verificar tu correo:</p>
            <a href="${verification_link}" style="padding:10px 20px; background:#4CAF50; color:white; text-decoration:none; border-radius:5px;">Verificar email</a>
            <p>O copia este enlace:</p>
            <p>${verification_link}</p>
        `;

        try {
            return await sendEmail({ to: email, subject: "Verificación de correo electrónico", html });
        } catch (error) {
            // Si falla, intentamos un reintento solo una vez
            console.warn("⚠️ Error enviando correo, intentando nuevamente…");
            try {
                return await sendEmail({ to: email, subject: "Verificación de correo electrónico", html });
            } catch (error2) {
                console.error("❌ Segundo intento fallido:", error2);
                throw new ServerError(500, "No se pudo enviar el correo de verificación");
            }
        }
    }

    // 📝 Registro de usuario
    static async register(username, password, email) {

        const existing = await UserRepository.getByEmail(email);

        if (existing) {
            if (!existing.verified_email) {
                console.log("📬 Usuario existente sin verificar → reenviando email");
                return await AuthService._sendVerificationEmail(
                    existing.username,
                    existing.email,
                    existing._id
                );
            }
            throw new ServerError(400, "Email ya registrado");
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await UserRepository.createUser(username, email, hashed);

        // Intentamos enviar mail de verificación con retry
        await AuthService._sendVerificationEmail(username, email, user._id);

        return user;
    }

    // ✅ Verificar email
    static async verifyEmail(token) {
        try {
            const payload = jwt.verify(token, ENVIRONMENT.JWT_SECRET_KEY);

            await UserRepository.updateById(payload.user_id, {
                verified_email: true
            });

            console.log("✅ Email verificado:", payload.user_id);
        } catch (err) {
            if (err instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, "Token inválido");
            }
            throw err;
        }
    }

    // 🔓 Login
    static async login(email, password) {
        const user = await UserRepository.getByEmail(email);
        if (!user) throw new ServerError(404, "Email no registrado");

        if (!user.verified_email)
            throw new ServerError(401, "Email no verificado. Revisa tu correo.");

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) throw new ServerError(401, "Contraseña incorrecta");

        const token = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "7d" }
        );

        console.log("🔓 Login exitoso:", email);
        return { authorization_token: token };
    }

    // 🔄 Reenviar correo de verificación
    static async resendVerification(email) {
        const user = await UserRepository.getByEmail(email);

        if (!user) throw new ServerError(404, "Email no registrado");
        if (user.verified_email) throw new ServerError(400, "Email ya verificado");

        return await AuthService._sendVerificationEmail(
            user.username,
            user.email,
            user._id
        );
    }
}

export default AuthService;
