import { Router } from "express";
import { UploadImage } from "../controllers/multimedia.controller";
import { upload } from "../middleware/upload";

const multimediaRouter = Router();

multimediaRouter.post('/upload', upload.single("image"), UploadImage);

export default multimediaRouter;