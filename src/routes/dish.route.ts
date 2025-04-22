import { Router } from "express";
import { CreateDish,DeleteDish,GetDishById,GetDishs,UpdateDish } from "../controllers/dish.controller";
//import {  } from "../middleware/authentication";

const dishRouter = Router();

dishRouter.get('/only/:id', GetDishById);
dishRouter.get('/all', GetDishs);
dishRouter.post('/create', CreateDish);
dishRouter.patch('/update/:id', UpdateDish);
dishRouter.delete('/delete/:id', DeleteDish);

export default dishRouter