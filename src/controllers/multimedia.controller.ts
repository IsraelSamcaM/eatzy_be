import { Request, Response } from "express";
import { uploadImageBuffer } from "../shared/imageMethods";


export const UploadImage = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "Image file is required" });
        }
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        if (!extension || !["jpg", "jpeg", "png", "webp"].includes(extension)) {
            return res.status(400).json({ success: false, message: "Invalid image extension" });
        }
        const imageUrl = await uploadImageBuffer(file.buffer, "images");
        res.status(201).json({ success: true, message: "Image uploaded successfully", data: imageUrl });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error uploading image" });
    }
}