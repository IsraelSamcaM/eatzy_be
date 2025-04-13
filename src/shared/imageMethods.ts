import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

import dotenv from "dotenv";

dotenv.config(); 

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!
});

export const uploadImageBuffer = async (buffer: Buffer, folder: string): Promise<string> => {
  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result); 
      }
    );

    const readable = new Readable();
    readable.push(buffer); 
    readable.push(null); 
    readable.pipe(uploadStream); 
  });

  return result.secure_url; 
};

