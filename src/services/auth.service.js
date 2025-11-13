import transporter from "../config/mailer.config.js"
import UserRepository from "../repositories/user.repository.js"
import { ServerError } from "../utils/customError.utils.js"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import ENVIRONMENT from "../config/environment.config.js"

class AuthService {
    static async register(username, password, email) {

        //Verificar que el usuario no este repido
        const user_found = await UserRepository.getByEmail(email)
        if (user_found) {
            throw new ServerError(400, 'Email ya en uso')
        }

        //Encriptar la contraseña
        const password_hashed = await bcrypt.hash(password, 12)

        //guardarlo en la DB
        const user_created = await UserRepository.createUser(username, email, password_hashed)

        const verification_token = jwt.sign(
            {
                email: email,
                user_id: user_created._id
            },
            ENVIRONMENT.JWT_SECRET_KEY
        )

        //Enviar un mail de verificacion al email proporcionado

        await transporter.sendMail({
            from: 'u.villalba2020@gmail.com',
            to: email,
            subject: 'Verificacion de correo electronico',
            html: `
            <h1>Hola</h1>
            <p>Prueba esta app web sencilla, tipo To Do!</p>

            <a href='${ENVIRONMENT.URL_API_BACKEND}/api/auth/verify-email/${verification_token}'>Verificar email</a>
            `
        })


        // await transporter.sendMail({
        //     from: 'u.villalba2020@gmail.com',
        //     to: 'u.villalba2020@gmail.com',
        //     subject: 'Verificacion de correo electronico',
        //     html: `
        //     <h1>Hola</h1>
        //     <p>Este es un mail de verificacion</p>
        //     <a href='http://localhost:8080/api/auth/verify-email/${verification_token}'>Verificar email</a>
        //     `
        // })

        // Devolver usuario creado (útil para tests/confirmaciones)
        return user_created
    }

    static async verifyEmail(verification_token){
        try{
            const payload = jwt.verify(verification_token, ENVIRONMENT.JWT_SECRET_KEY)

            await UserRepository.updateById(
                payload.user_id, 
                {
                    verified_email: true
                }
            )

            return 

        }
        catch(error){
            if(error instanceof jwt.JsonWebTokenError){
                throw new  ServerError(400, 'Token invalido')
            }
            throw error
        }
    }

    static async login(email, password){
        const user = await UserRepository.getByEmail(email)
        if(!user){
            throw new ServerError(404, 'Email no registrado')
        }

        if(user.verified_email === false){
            throw new ServerError(401, 'Email no verificado. Revisa tu correo o solicita reenvío.')
        }

        const is_same_password = await bcrypt.compare(password, user.password)
        if(!is_same_password){
            throw new ServerError(401, 'Contraseña incorrecta')
        }

        const authorization_token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                created_at: user.created_at
            },
            ENVIRONMENT.JWT_SECRET_KEY,
            {
                expiresIn: '7d'
            }
        )

        return {
            authorization_token
        }
    }

    // Método nuevo: reenviar mail de verificación
    static async resendVerification(email){
        const user = await UserRepository.getByEmail(email)
        if(!user){
            throw new ServerError(404, 'Email no registrado')
        }
        if(user.verified_email === true){
            throw new ServerError(400, 'Email ya verificado')
        }

        const verification_token = jwt.sign(
            {
                email: email,
                user_id: user._id
            },
            ENVIRONMENT.JWT_SECRET_KEY
        )

        // await transporter.sendMail({
        //     from: 'no-reply@tu-dominio.com',
        //     to: email,
        //     subject: 'Reenvío: Verificación de correo electrónico',
        //     html: `<p>Haz click para verificar:</p>
        //            <a href='http://localhost:8080/api/auth/verify-email/${verification_token}'>Verificar email</a>`
        // })

        return { message: 'Correo de verificación reenviado' }
    }
}

export default AuthService