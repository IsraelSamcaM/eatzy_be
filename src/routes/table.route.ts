import { Router } from "express";
import { createTableWithQR, getAllTables, handleQRScan,deleteTable,getTableById} from "../controllers/table.controller";
import { table } from "console";

const tableRouter = Router();

tableRouter.get('/all', getAllTables);
tableRouter.get('/scan/:qrCodeUrl', handleQRScan);
tableRouter.get('/only/:id',getTableById)
tableRouter.post('/create', createTableWithQR);
tableRouter.delete('/delete/:id', deleteTable)

export default tableRouter;