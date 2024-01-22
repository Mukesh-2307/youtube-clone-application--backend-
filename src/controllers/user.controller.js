import {asyncHandler} from "../utils/asyncHandler.js"
import{apiError} from "../utils/apiErrors.js"
import{apiResponse} from "../utils/apiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloud } from "../utils/cloudinary.js"

const generateSktTknAndAccTkn = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new apiError(500,"something went wrong while generating tokens.")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    // res.status(200).json({
    //     message: "api working properly"
    // })

    // take inputs from users thorugh frontend
    const {userName,email,fullName,password} = req.body
    // console.log("username: ",userName,"password: ",password)

    // perform checks or validation
    // if(fullName === ""){
    //     throw new apiError(400,"fullname is required")
    // }
    if(
        [fullName,email,userName,password].some((field) => {
            field?.trim()===""
        })
    ){
        throw new apiError(400,"all fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{userName},{email}]
    })

    // check if user already registered through : username and email
    if(existedUser){
        throw new apiError(409,"user already exist")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    // console.log(coverImageLocalPath)

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

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

    // if(!cover){
    //     throw new apiError(400,"cover is required")
    // }

    // create user obj - create entry in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: cover?.url || "",
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

const loginUser = asyncHandler(async(req,res)=>{
    // take inputs from user 
    const {email, userName, password} = req.body

    console.log(userName,email)

    // email based or username based
    if(!userName && !email){
        throw new apiError(400,"username or email is required")
    }
    
    // find user
    // check whether user exist or not 
    const user = await User.findOne({
        $or: [{userName},{email}]
    })
    
    // if do not exist the redirect to signup page
    if(!user){
        throw new apiError(404,"user does not exist")
    }

    // console.log(user)
    // if exist check for password 
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    // if password is wrong, then reenter password
    if(!isPasswordCorrect){
        throw new apiError(401,"invalid user credentials")
    }

    console.log(user._id)

    // if password is correct, then provide access and refresh token
    const {accessToken,refreshToken} = await generateSktTknAndAccTkn(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(200,{user: loggedInUser,accessToken,refreshToken},"user loggedin successfully")
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {$set:{refreshToken: undefined}},
        {new: true}
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookies("accesstToken", options).clearCookies("refreshToken",options)
    .json(
        new apiResponse(200, {}, "user logged out successfully")
    )
})
export {registerUser,loginUser,logoutUser}