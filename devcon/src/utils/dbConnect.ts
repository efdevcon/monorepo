import mongoose from 'mongoose'
import { SERVER_CONFIG } from '../utils/server'

// Global is used here to maintain a cached connection and prevents connections growing exponentially
let cached = (global as any).mongoose
if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {

        cached.promise = mongoose.connect(SERVER_CONFIG.DB_CONNECTION_STRING, {
            // useNewUrlParser: true,
            //useFindAndModify: false,
            // useUnifiedTopology: true,
            //useCreateIndex: true,
        }).then((mongoose) => {
            console.log('mongoose is connected')
            return mongoose
        })
    }

    cached.conn = await cached.promise
    return cached.conn
}

export default dbConnect
