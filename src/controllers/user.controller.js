import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiErrors.js"
import { apiResponse } from "../utils/apiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloud } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateSktTknAndAccTkn = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new apiError(500, "something went wrong while generating tokens.")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json({
    //     message: "api working properly"
    // })

    // take inputs from users thorugh frontend
    const { userName, email, fullName, password } = req.body
    // console.log("username: ",userName,"password: ",password)

    // perform checks or validation
    // if(fullName === ""){
    //     throw new apiError(400,"fullname is required")
    // }
    if (
        [fullName, email, userName, password].some((field) => {
            field?.trim() === ""
        })
    ) {
        throw new apiError(400, "all fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })

    // check if user already registered through : username and email
    if (existedUser) {
        throw new apiError(409, "user already exist")
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    // console.log(coverImageLocalPath)

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new apiError(400, "avatar file is required")
    }

    // store images and avatar in cloudinary 
    const avatar = await uploadOnCloud(avatarLocalPath)
    const cover = await uploadOnCloud(coverImageLocalPath)

    // check file perfectly uploaded in cloudinary
    if (!avatar) {
        throw new apiError(400, "avatar is required")
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
    if (!createdUser) {
        throw new apiError(500, "internal server error")
    }

    // return response
    return res.status(201).json(
        new apiResponse(200, createdUser, "user registered successfully")
    )
    // if error occured throw error

})

const loginUser = asyncHandler(async (req, res) => {
    // take inputs from user 
    const { email, userName, password } = req.body

    // console.log(userName,email)

    // email based or username based
    if (!userName && !email) {
        throw new apiError(400, "username or email is required")
    }

    // find user
    // check whether user exist or not 
    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })

    // if do not exist the redirect to signup page
    if (!user) {
        throw new apiError(404, "user does not exist")
    }

    // console.log(user)
    // if exist check for password 
    const isPasswordCorrect = await user.isPasswordCorrect(password)

    // if password is wrong, then reenter password
    if (!isPasswordCorrect) {
        throw new apiError(401, "invalid user credentials")
    }

    // console.log(user._id)

    // if password is correct, then provide access and refresh token
    const { accessToken, refreshToken } = await generateSktTknAndAccTkn(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "user loggedin successfully")
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accesstToken", options).clearCookie("refreshToken", options)
        .json(
            new apiResponse(200, {}, "user logged out successfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefToken) {
        throw new apiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefToken, process.env.REFRESH_TOKEN_SECRET)

        const user = User.findById(decodedToken?._id)

        if (!user) {
            throw new apiError(401, "invalid refresh token")
        }

        if (incomingRefToken !== user?.refreshToken) {
            throw new apiError(401, "refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateSktTknAndAccTkn(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiResponse(200, { accessToken, refreshToken: newRefreshToken },
                    "access token refreshed")
            )
    } catch (error) {
        throw new apiError(500, error?.message || "something went wrong while updating refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // const {oldPassword, newPassword, confirmPassword} = req.body
    // if(newPassword === confirmPassword){

    // }

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new apiError(401, "invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new apiResponse(100, {}, "password changed successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new apiResponse(200, req.user, "user fetched successfully (current)"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new apiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "account deatils updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.id

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloud(avatarLocalPath)

    if (!avatar.url) {
        throw new apiError(400, "error while uploading on cloud")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "avatar updated successfully"))
})

const updateUserCoverImg = asyncHandler(async (req, res) => {
    const CoverImgLocalPath = req.file?.id

    if (!CoverImgLocalPath) {
        throw new apiError(400, "CoverImg file is required")
    }

    const coverImg = await uploadOnCloud(CoverImgLocalPath)

    if (!coverImg.url) {
        throw new apiError(400, "error while uploading on cloud")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImg.url
            }
        },
        { new: true }).select("-password")

    return res.status(200).json(new apiResponse(200, user, "coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim) {
        throw new apiError(400, "username not missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "Subscription",
                localField: "_id",
                foreignField: "channels",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedTocount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                userName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedTocount: 1,
                isSubscribed: 1
            }
        }
    ])

    if (!channel?.length){
        throw new apiError(404,"channel does not exist")
    }

    return res.status(200).json(new apiResponse(200,channel[0],"fetched user's channel successfully"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from : "video",
                localField: "watchHistory",
                foreignField: "_id",
                as : "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project:{
                                        userName: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            $first: "$owner"
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new apiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImg, getUserChannelProfile,getWatchHistory}