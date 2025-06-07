import { Router } from "express";
import { createTableWithQR, getAllTables, handleQRScan,deleteTable,getTableById,patchTableById, checkTable, payCheck} from "../controllers/table.controller";
import { table } from "console";

const tableRouter = Router();

tableRouter.get('/all', getAllTables);
tableRouter.post('/scan', handleQRScan);
tableRouter.get('/only/:id',getTableById)
tableRouter.patch('/update/:id',patchTableById)
tableRouter.post('/create', createTableWithQR);
tableRouter.delete('/delete/:id', deleteTable);
tableRouter.get('/check/:id', checkTable)
tableRouter.put('/pay/:id', payCheck)

export default tableRouter;