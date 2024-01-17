import mongoose, { Schema } from "mongoose";
import Jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar:{
        type: String, // we will retrive url from cloudnary
        required: true
    },
    coverImage: {
        type: String // we will retrive url from cloudnary
    },
    watchHistory:{
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    password:{
        type: String,
        required: [true, 'password is required']
    },
    refreshToken:{
        type: String
    }
},
{
    timestamps:true
})

userSchema.pre("save", async function (next){
    if(!this.isModified("password")){
        next()
    }
    this.password = bcrypt.hash(this.password,10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return bcrypt.compare(password,this.password)
}

userSchema.methods.generateSecretKey = function(){
    return Jwt.sign(
        {
            _id: this._id,
            email: this.email,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.SECRET_KEY,
        {
            expiresIn: process.env.SECRET_KEY_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return Jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)