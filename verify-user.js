import mongoose from "mongoose";
import ENVIRONMENT from "./src/config/environment.config.js";

const connectAndVerify = async () => {
    try {
        await mongoose.connect(ENVIRONMENT.MONGO_DB_CONNECTION_STRING);
        const result = await mongoose.connection.db.collection('users').updateOne(
            { email: 'u.villalba2020@gmail.com' },
            { $set: { verified_email: true } }
        );
        console.log('Usuario verificado:', result.modifiedCount > 0 ? '✓' : 'No encontrado');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

connectAndVerify();