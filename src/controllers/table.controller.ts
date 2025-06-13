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
        const { qrCode, nameCustomer  } = req.body;

        const table = await prisma.table.findFirst({
            where: { qrCode: qrCode },
            include:{
                customers:{
                    where: {available:true}
                }
            }
        });

        if (!table) {
            return res.status(404).json({ success: false, message: "Table no found" });
        }

        if (table.status==='MAINTENANCE' || table.status==='DELETED' || table.status==='RESERVED') {
            return res.status(409).json({ success: false, message: "La mesa no esta disponible actualmente." });
        }

        if (table.customers.length >= table.capacity) {
            return res.status(429).json({ 
                success: false, 
                message: "La mesa ha alcanzado su capacidad máxima" 
            });
        }

        const newCustomer = await prisma.temporaryCustomer.create({
            data: {
                name_customer: nameCustomer,
                tableId: table.id
            },
            include: {
                table: true
            }
        });

        let updatedTable;
        if (table.customers.length + 1 === table.capacity) {
            updatedTable = await prisma.table.update({
                where: { id: table.id },
                data: { status: 'OCCUPIED' }
            });
        } else {
            updatedTable = table;
        }

        const io = req.app.get('io');
        io.emit('table_updated', updatedTable);

        return res.status(200).json({success: true, message: "Cliente asignado a la mesa", data: {table: updatedTable, customer: newCustomer} });
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
        const { includeDetails, simple } = req.query as {includeDetails?: string, simple?: string};

        if (includeDetails !== 'true' && simple !== 'true') {
            const table = await prisma.table.findUnique({
                where: { 
                    id: Number(id),
                    delete: false 
                }
            });

            if(!table) {
                return res.status(404).json({ success: false, message: "Table not found" });
            }
            return res.status(200).json({ 
                success: true,
                message: "Table without details", 
                data: table 
            });
        }

        const tableWithDetails = await prisma.table.findUnique({
            where: { 
                id: Number(id),
                delete: false 
            },
            include: {
                customers: {
                    include: {
                        orders: {
                            where:{
                                order: {
                                    status: {
                                        in: ["PENDING","READY"]
                                    }
                                }
                            },
                            include: {
                                assignedItems: {
                                    include: {
                                        dish: true
                                    }
                                },
                                order: {
                                    select: {
                                        id: true,
                                        status: true,
                                        tableId: true
                                    },
                                }
                            }
                        }
                    }
                },
            }
        });

        if(!tableWithDetails) {
            return res.status(404).json({ success: false, message: "Table not found" });
        }

        if (simple === 'true') {
            const simpleData = tableWithDetails.customers.flatMap(customer =>
                customer.orders.flatMap(orderCustomer =>
                    orderCustomer.assignedItems.map(item => ({
                        id_table: orderCustomer.order.tableId,
                        id_customer: customer.id,
                        id_order: orderCustomer.order.id,
                        id_order_item: item.id,
                        id_dish: item.dish.id,
                        name_customer: customer.name_customer,
                        quantity: item.quantity,
                        status: item.status,
                        name_dish: item.dish.name,
                        type: item.dish.type,
                        description: item.dish.description,
                        price: item.dish.price,
                        isAvailable: item.dish.isAvailable,
                        imageUrl: item.dish.imageUrl,
                        prepTime: item.dish.prepTime
                    }))
                )
            );

            return res.status(200).json({ success: true, message: "Table data in simple format",  data: simpleData });
        }

        const customersWithItems = tableWithDetails.customers.map(customer => {
            const orderItems = customer.orders.flatMap(orderCustomer => 
                orderCustomer.assignedItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    status: item.status,
                    notes: item.notes,
                    dish: item.dish,
                    orderId: orderCustomer.order.id,
                    orderStatus: orderCustomer.order.status
                }))
            );

            return {
                id: customer.id,
                name: customer.name_customer,
                orderItems: orderItems
            };
        });

        const detailedResponse = {
            id: tableWithDetails.id,
            number: tableWithDetails.number,
            capacity: tableWithDetails.capacity,
            status: tableWithDetails.status,
            qrCode: tableWithDetails.qrCode,
            qrCodeUrl: tableWithDetails.qrCodeUrl,
            customers: customersWithItems
        };

        return res.status(200).json({ success: true, message: "Table with all details",  data: detailedResponse  });
    } catch (error) {
        console.error("Error fetching table details:", error);
        return res.status(500).json({ success: false, message: "Error retrieving table details" });
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
                status: 'DELETED'
            }
        });

        await prisma.table.deleteMany({})

        const io = req.app.get('io');
        io.emit('table_deleted', { id:  deletedTable.id});

        return res.status(200).json({ success: true, message: "Table delete succesfully", data: deletedTable });

    } catch (error) {
        console.error("Error deleting table:", error);
        return res.status(500).json({ success: false, message: "Error deleting table" });
    }
};

export const patchTableById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { capacity, status } = req.body;

        if (capacity === undefined && status === undefined) {
            return res.status(400).json({ success: false, message: "At least one field must be provided (capacity or status)" });
        }

        if (capacity !== undefined && (isNaN(capacity) || capacity <= 0)) {
            return res.status(400).json({ success: false, message: "Capacity must be a positive number" });
        }

        if (status !== undefined) {
            const upperStatus = status.toUpperCase();
            if (!Object.values(TableStatus).includes(upperStatus as TableStatus)) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid status. Must be one of: ${Object.values(TableStatus).join(", ")}` 
                });
            }
        }

        const existingTable = await prisma.table.findUnique({ where: { id: Number(id) }});

        if (!existingTable) {
            return res.status(404).json({ 
                success: false, 
                message: "Table not found, are you sure you are entering the id and not the table number?" 
            });
        }

        const updateData: {
            capacity?: number;
            status?: TableStatus;
        } = {};

        if (capacity !== undefined) updateData.capacity = capacity;
        if (status !== undefined) updateData.status = status.toUpperCase() as TableStatus;

        const updatedTable = await prisma.table.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        const io = req.app.get('io');
        io.emit('table_updated', updatedTable);

        return res.status(200).json({ 
            success: true, 
            message: "Table updated successfully", 
            data: updatedTable 
        });

    } catch (error) {
        console.error("Error updating table:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error updating table" 
        });
    }
};

export const checkTable = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tableWithOrder = await prisma.table.findUnique({
            where: { 
                id: Number(id),
                delete: false 
            },
            include: {
                orders: {
                    where: {
                        status: {
                            in: ['PENDING','READY']
                        }
                    },
                    include: {
                        items: {
                            where: {
                                status: 'READY'
                            },
                            include: {
                                dish: true,
                                customer: {
                                    include: {
                                        customer: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!tableWithOrder) {
            return res.status(404).json({ 
                success: false, 
                message: "Mesa no encontrada o eliminada" 
            });
        }

        if (tableWithOrder.orders.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: "No hay orden PENDING para esta mesa",
                data: [] 
            });
        }

        const pendingOrder = tableWithOrder.orders[0];
        if(pendingOrder.status==='PENDING'){
            await prisma.order.update({
                where:{id: pendingOrder.id},
                data:{status: 'READY'}
            })
        }

        const formattedItems = pendingOrder.items.map(item => ({
            id_table: tableWithOrder.id,
            number: tableWithOrder.number,
            id_customer: item.customer?.customerId || null,
            id_order: pendingOrder.id,
            id_order_item: item.id,
            id_dish: item.dish.id,
            name_customer: item.customer?.customer.name_customer || 'Sin asignar',
            quantity: item.quantity,
            status: item.status,
            name_dish: item.dish.name,
            type: item.dish.type,
            description: item.dish.description,
            price: item.dish.price,
            isAvailable: item.dish.isAvailable,
            imageUrl: item.dish.imageUrl,
            prepTime: item.dish.prepTime
        }));

        if(tableWithOrder.isNotification!==true){
            const updatedTable = await prisma.table.update({
                where: { id: tableWithOrder.id },
                data: { isNotification: true }
            })

            const io = req.app.get('io');
            io.emit('table_updated', updatedTable);
        }
        return res.status(200).json({
            success: true,
            message: `Items table ${id}`,
            data: formattedItems
        });

    } catch (error) {
        console.error("Error en checkTable:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}

export const payCheck = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const io = req.app.get('io');

        const order = await prisma.order.findFirst({
            where: {
                tableId: Number(id),
                status: 'READY'
            },
            include: {
                items: true,
                table: true
            }
        });

        if (!order) {
            return res.status(404).json({success: false, message: "No hay orden READY para esta mesa" });
        }

        order.items.forEach(item => {
            io.emit('order_item_deleted', item.id);
        });

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { status: 'PAID' }
        });

        const updatedTable = await prisma.table.update({
            where: { id: Number(id) },
            data: { 
                status: 'AVAILABLE',
                isNotification: false,
            },
        });

        await prisma.temporaryCustomer.updateMany({
            where:{ 
                tableId: updatedTable.id,
                available: true
            },
            data: {
                available: false
            }
        })

        io.emit('table_updated', updatedTable);

        return res.status(200).json({
            success: true,
            message: "Pago procesado correctamente, datos actualizados",
            data: {
                updatedOrder,
                updatedTable
            }
        });

    } catch (error) {
        console.error("Error en payCheck:", error);
        return res.status(500).json({
            success: false,
            message: "Error al procesar el pago",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}



