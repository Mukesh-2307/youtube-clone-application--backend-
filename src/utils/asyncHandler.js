// Method 1: the below code is a async handler using try catch method

// const asyncHandler = (func) => async(req,res,next) => {
//     try {
//         await func(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }

// Method 2: the below code is a async handler by directly dealing with the promises
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch(
            (err) => next(err)
        )
    }
}

export {asyncHandler}