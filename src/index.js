// require('dotenv').config({path: './env'})  <--- older version

// new version of dealing with dotenv
import dotenv from "dotenv"
import express from "express";
import connectToDB from "./db/index.js";

// first approach to connect to DB
// const app = express()
// (async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
//         app.listen(process.env.PORT, ()=>{
//             console.log(`app is listening at port ${process.env.PORT}`)
//         })
//     } catch (error) {
//         console.log("error:",error)
//     }
// })()

dotenv.config({
    path: './env'
})

connectToDB()