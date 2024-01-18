import {asyncHandler} from "../utils/asyncHandler.js"
import{apiError} from "../utils/apiErrors.js"
import{apiResponse} from "../utils/apiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloud } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message: "api working properly"
    // })

    // take inputs from users thorugh frontend
    const {userName,email,fullName,password} = req.body
    console.log("username: ",userName,"password: ",password)
    // perform checks or validation
    // if(fullName === ""){
    //     throw new apiError(400,"fullname is required")
    // }
    if(
        [fullName,email,userName,password].some((field)=>{
            field?.trim()===""
        })
    ){
        throw new apiError(400,"all fields are required")
    }

    const existedUser = User.findOne({
        $or:[{userName},{email}]
    })

    // check if user already registered through : username and email
    if(existedUser){
        throw new apiError(409,"user already exist")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    console.log(coverImageLocalPath)

    if(!avatarLocalPath){
        throw new apiError(400, "avatar file is required")
    }

    // store images and avatar in cloudinary 
    const avatar = await uploadOnCloud(avatarLocalPath)
    const cover = await uploadOnCloud(coverImageLocalPath)

    // check file perfectly uploaded in cloudinary
    if(!avatar){
        throw new apiError(400,"avatar is required")
    }

    if(!cover){
        throw new apiError(400,"avatar is required")
    }

    // create user obj - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // check for user creation
    if(!createdUser){
        throw new apiError(500,"internal server error")
    }

    // return response
    return res.status(201).json(
        new apiResponse(200,createdUser, "user registered successfully")
    )
    // if error occured throw error

})

export {registerUser}