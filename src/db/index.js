import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectToDB = async ()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`successfully connected to the DB \n DB host : ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log('unable to connect to DB',error)
        process.exit(1)
    }
}

export default connectToDB