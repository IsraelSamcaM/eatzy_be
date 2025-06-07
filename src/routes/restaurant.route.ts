import { Router } from "express";
import { CreateRestaurant, getRestaurants,verifyEmail } from "../controllers/restaurant.controller";
import { upload } from "../middleware/upload";

const restaurantRouter = Router();

restaurantRouter.get('/', getRestaurants);
restaurantRouter.post('/create',upload.single("logo"), CreateRestaurant);
restaurantRouter.post('/email', verifyEmail)


export default restaurantRouter