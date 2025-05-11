import { Request, Response } from "express";
import { TableStatus } from "@prisma/client";
import { prisma } from "../index";
import QRCode from "qrcode";
import { uploadImageBuffer } from '../shared/imageMethods'; 
import dishRouter from "../routes/dish.route";

export const createTableWithQR = async (req: Request, res: Response) => {
    try {
        const { number, capacity, status } = req.body;
        if (!number || !capacity || !status ) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        const upperStatus = status?.toUpperCase();
        if (!Object.values(TableStatus).includes(upperStatus as TableStatus)) {
            return res.status(400).json({success: false, message: `Invalid type. Must be one of: ${Object.values(TableStatus).join(", ")}`});
        }
        const existingNumberTable = await prisma.table.findFirst({ where:{ number: number} });
        if(existingNumberTable){
            return res.status(400).json({success: false, message: "Table with this number already exists"});
        }
        const tableUrl = `TABLECOD${number}`;

        const qrBuffer = await QRCode.toBuffer(tableUrl);

        const qrImageUrl = await uploadImageBuffer(qrBuffer, 'restaurant/qrs');

        const table = await prisma.table.create({
            data: {
                number,
                capacity,
                status: upperStatus,
                restaurantId: 1,
                qrCode: tableUrl,      
                qrCodeUrl: qrImageUrl,   
            },
        });
        const io = req.app.get('io');
        io.emit('table_created', table);

        return res.status(201).json({ success: true, message: "Table created successfully", data: table});
    } catch (error) {
        console.error("Error creating table:", error);
        return res.status(500).json({ success: false, message: "Error creating table" });
    }
};

export const handleQRScan = async (req: Request, res: Response) => {
    try {
        const { qrCodeUrl } = req.params;

        const table = await prisma.table.findFirst({
            where: { qrCodeUrl: qrCodeUrl },
        });

        if (!table) {
            return res.status(404).json({ success: false, message: "Table no found" });
        }
        await prisma.table.update({
            where: { id: table.id },
            data: { status: 'OCCUPIED' }
        });

        const io = req.app.get('io');
        io.emit('table_occupied', table);

        return res.status(200).json({success: true, message: "Table found and status updated", data: table });
    } catch (error) {
        console.error("Error handling QR scan:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al procesar el QR" 
        });
    }
};

export const getAllTables = async (req: Request, res: Response) => {
    try {
        const { status } = req.query as { status?: string};        
        const whereCondition: {
            status?: TableStatus;
            delete: boolean;
        } = {
            delete: false 
        }

        if(status){
            const upperStatus = status.toUpperCase();
            if (!Object.values(TableStatus).includes(upperStatus as TableStatus)) {
                return res.status(400).json({success: false, message: `Invalid type. Must be one of: ${Object.values(TableStatus).join(", ")}`});
            }
            whereCondition.status = upperStatus as TableStatus;
        }
        const tables = await prisma.table.findMany({
            where: whereCondition,
            orderBy: {
                number: 'asc'     
            }
        });
        return res.status(200).json({success: true, message: "Tables fetched successfully", data:tables} );
    } catch (error) {
        console.error("Error fetching tables:", error);
        return res.status(500).json({ success: false, message: "Error fetching tables" });
    }
};

export const getTableById = async(req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { includeDetails } = req.query as {includeDetails?: string};
        const table = await prisma.table.findUnique({
            where: { 
                id: Number(id),
                delete: false 
            },
            include: {
                orders: includeDetails === 'true' ? {
                include: {
                items: {
                    include: {
                        dish: true  
                    }
                }
                },
                orderBy: [ { status: 'asc'},
                { createdAt: 'desc' }]
            } : false
            }
        });

        if(!table){
            return res.status(404).json({ success: false, message: "Table not found" });
        }
        return res.status(200).json({ success: true, data: table});
    } catch (error) {
        console.error("Error fetching tables:", error);
        return res.status(500).json({ success: false, message: "Error retrieving table" });
    }
}

export const deleteTable = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const existingTable = await prisma.table.findUnique({ where: { id: Number(id) }});

        if (!existingTable) {
            return res.status(404).json({ success: false, message: "Table no found"});
        }

        if (existingTable.delete) {
            return res.status(400).json({success: false,message: "The table has already been deleted previously"
            });
        }
        const activeOrders = await prisma.order.count({
            where: {
                tableId: Number(id),
                status: {
                    notIn: ['DELIVERED', 'CANCELLED', 'PAID']
                }
            }
        });

        if (activeOrders > 0) {
            return res.status(400).json({success: false, message: "The table cannot be deleted because it has active orders"});
        }

        const deletedTable = await prisma.table.update({
            where: { id: Number(id) },
            data: { 
                delete: true,
                status: 'MAINTENANCE'
            }
        });

        await prisma.table.deleteMany({})

        const io = req.app.get('io');
        io.emit('table_deleted', { id:  deletedTable.id});

        return res.status(200).json({ success: true, message: "Mesa eliminada correctamente", data: deletedTable });

    } catch (error) {
        console.error("Error al eliminar mesa:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno al eliminar la mesa"
        });
    }
};





