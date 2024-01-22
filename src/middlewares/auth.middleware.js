import { apiError } from "../utils/apiErrors.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import JWT from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("authorization")?.replace("bearer", "")

        if (!token) {
            throw new apiError(401, "unauthorized token")
        }

        const decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
            .select("-password -refreshToken")

        if (!user) {
            throw new apiError(401, "invalid access token")
        }

        req.user = user;
        next()
    } catch (error) {
        throw new apiError(401, error?.message || "invalid access token ")
    }
})