import { Router } from "express";
import { CreateDish,DeleteDish,filterDishes,GetDishById,GetDishes,GetDishesWithPagination,UpdateDish } from "../controllers/dish.controller";
//import {  } from "../middleware/authentication";

const dishRouter = Router();

dishRouter.get('/only/:id', GetDishById);
dishRouter.get('/all', GetDishes);
dishRouter.get('/all/pagination', GetDishesWithPagination); 
dishRouter.get('/filter', filterDishes);
dishRouter.post('/create', CreateDish);
dishRouter.patch('/update/:id', UpdateDish);
dishRouter.delete('/delete/:id', DeleteDish);

export default dishRouter