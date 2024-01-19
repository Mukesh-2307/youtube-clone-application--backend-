import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const uploadOnCloud = async (localPath) =>{
    try {
        if(!localPath){
            return null
        }
        // uploading file on cloud
        const response = await cloudinary.uploader.upload(localPath,{
            resource_type: "auto"
        })
        // console.log("file uploaded successfully",response.url)
        fs.unlinkSync(localPath)
        return response
    } catch (error) {
        fs.unlinkSync(localPath) // remove the locally saved temp file as the upload ops got failed
    }
}

export {uploadOnCloud}