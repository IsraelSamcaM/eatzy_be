import { Router } from "express";
import { createOrder, getAllToPanel, patchItemOrder } from "../controllers/order.controller";

const orderRouter = Router();

orderRouter.get('/panel', getAllToPanel)
orderRouter.post('/create', createOrder)
orderRouter.patch('/update/:id', patchItemOrder)

export default orderRouter;