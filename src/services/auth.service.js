import UserRepository from "../repositories/user.repository.js";
import { ServerError } from "../utils/customError.utils.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import ENVIRONMENT from "../config/environment.config.js";
import { sendEmail } from "../config/mailer.config.js";

class AuthService {

    static async _sendVerificationEmail(username, email, user_id) {

        const token = jwt.sign(
            { email, user_id },
            ENVIRONMENT.JWT_SECRET_KEY,
            { expiresIn: "1d" }
        );

        const link = `${ENVIRONMENT.URL_FRONTEND}/verify-email?token=${token}`;

        const html = `
            <h1>Hola ${username}</h1>
            <p>Haz clic para verificar tu correo:</p>
            <a href="${link}" style="padding:10px 20px;background:#4CAF50;color:#fff;border-radius:4px;text-decoration:none;">Verificar email</a>
            <p>O copia este enlace:</p>
            <p>${link}</p>
        `;

        return await sendEmail({
            to: email,
            subject: "Verificación de correo electrónico",
            html
        });
    }

    static async register(username, password, email) {

        const existing = await UserRepository.getByEmail(email);

        if (existing) {
            if (!existing.verified_email) {
                console.log("📬 Usuario ya existe sin verificar → reenviando email…");
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

        await AuthService._sendVerificationEmail(username, email, user._id);

        return user;
    }

    static async verifyEmail(token) {
        try {
            const payload = jwt.verify(token, ENVIRONMENT.JWT_SECRET_KEY);

            await UserRepository.updateById(payload.user_id, {
                verified_email: true
            });

        } catch (err) {
            if (err instanceof jwt.JsonWebTokenError) {
                throw new ServerError(400, "Token inválido");
            }
            throw err;
        }
    }

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

        return { authorization_token: token };
    }

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
