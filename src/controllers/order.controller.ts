import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../index";

export const createOrder = async (req: Request, res: Response) => {
    try {
        const { id_table, id_customer, dishes } = req.body;

        if (!id_table || !id_customer || !dishes || !Array.isArray(dishes)) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: id_table, id_customer, dishes" 
            });
        }

        const table = await prisma.table.findUnique({
            where: { id: Number(id_table) },
            include: { customers: true }
        });

        if (!table) {
            return res.status(404).json({ success: false, message: "Table not found" });
        }

        const customer = table.customers.find(c => c.id === Number(id_customer));
        if (!customer) {
            return res.status(404).json({ success: false, message: "Customer not found at this table" });
        }

        const dishIds = dishes.map(d => d.id);
        const existingDishes = await prisma.dish.findMany({
            where: { id: { in: dishIds } }
        });

        if (existingDishes.length !== dishIds.length) {
            const missingDishes = dishIds.filter(id => 
                !existingDishes.some(d => d.id === id)
            );
            return res.status(404).json({ success: false, message: `Some dishes not found: ${missingDishes.join(', ')}` });
        }

        const order = await prisma.order.create({
            data: {
                code: `ORD-${Date.now()}`,
                status: 'PENDING',
                total: 0, 
                tableId: Number(id_table),
                customers: {
                    create: {
                        customerId: Number(id_customer)
                    }
                }
            },
            include: {
                customers: true
            }
        });

        const io = req.app.get('io');
        const createdItems = [];

        for (const dishItem of dishes) {
            const dish = existingDishes.find(d => d.id === dishItem.id);
            if (!dish) continue;

            const orderItem = await prisma.orderItem.create({
                data: {
                    quantity: dishItem.quantity,
                    status: 'PENDING',
                    orderId: order.id,
                    dishId: dish.id,
                    orderCustomerOrderId: order.id,
                    orderCustomerCustomerId: customer.id
                },
                include: {
                    dish: true,
                    customer: {
                        include: {
                            customer: true
                        }
                    }
                }
            });

            const itemData = {
                id_table: Number(id_table),
                id_customer: customer.id,
                id_order: order.id,
                id_order_item: orderItem.id,
                id_dish: dish.id,
                name_customer: customer.name_customer,
                quantity: orderItem.quantity,
                status: orderItem.status,
                name_dish: dish.name,
                type: dish.type,
                description: dish.description,
                price: dish.price,
                isAvailable: dish.isAvailable,
                imageUrl: dish.imageUrl,
                prepTime: dish.prepTime
            };

            io.emit('order_item_created', itemData);
            createdItems.push(itemData);
        }

        const total = createdItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        await prisma.order.update({
            where: { id: order.id },
            data: { total }
        });

        return res.status(201).json({ 
            success: true, 
            message: "Order and Order Items created successfully",
            data: {
                id_order: order.id,
                items: createdItems
            }
        });

    } catch (error) {
        console.error("Error creating order:", error);
        return res.status(500).json({ success: false, message: "Error creating order" });
    }
}

export const patchItemOrder = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const upperStatus = status.toUpperCase();
        if (!Object.values(OrderStatus).includes(upperStatus as OrderStatus)) {
            return res.status(400).json({success: false, message: `Invalid type. Must be one of: ${Object.values(OrderStatus).join(", ")}`});
        }
        
        const updatedItem = await prisma.orderItem.update({
            where: { id: Number(id) },
            data: { status },
            include: {
                dish: true,
                customer: {
                    include: {
                        customer: true,
                        order: {
                            include: {
                                table: true
                            }
                        }
                    }
                }
            }
        });

        if (!updatedItem) {
            return res.status(404).json({  success: false, message: "Order item not found" });
        }

        const itemData = {
            id_table: updatedItem.customer?.order.tableId || 0,
            id_customer: updatedItem.customer?.customer.id || 0,
            id_order: updatedItem.orderId,
            id_order_item: updatedItem.id,
            id_dish: updatedItem.dish.id,
            name_customer: updatedItem.customer?.customer.name_customer || '',
            quantity: updatedItem.quantity,
            status: updatedItem.status,
            name_dish: updatedItem.dish.name,
            type: updatedItem.dish.type,
            description: updatedItem.dish.description,
            price: updatedItem.dish.price,
            isAvailable: updatedItem.dish.isAvailable,
            imageUrl: updatedItem.dish.imageUrl,
            prepTime: updatedItem.dish.prepTime
        };

        const io = req.app.get('io');
        io.emit('order_item_updated', itemData);

        return res.status(200).json({ success: true, message: "Order item updated successfully", data: itemData });
    } catch (error) {
        console.error("Error updating order item:", error);
        return res.status(500).json({ success: false, message: "Error creating order" });
    }
}

export const getAllToPanel = async (req: Request, res: Response) => {
    try {
        type PanelStatus = 'PENDING' | 'IN_PREPARATION' | 'READY' | 'CANCELLED';
        const requiredStatuses: PanelStatus[] = ['PENDING', 'IN_PREPARATION', 'READY', 'CANCELLED'];

        const orderItems = await prisma.orderItem.findMany({
            where: {
                status: {
                    in: requiredStatuses
                }
            },
            include: {
                dish: true,
                customer: {
                    include: {
                        customer: true,
                        order: {
                            include: {
                                table: true
                            }
                        }
                    }
                },
                order: true
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const flatItems = orderItems.map(item => ({
            id_table: item.customer?.order.table.id || 0,
            number: item.customer?.order.table.number || 0, 
            id_customer: item.customer?.customer.id || 0,
            id_order: item.orderId,
            id_order_item: item.id,
            id_dish: item.dish.id,
            name_customer: item.customer?.customer.name_customer || 'Cliente desconocido',
            quantity: item.quantity,
            status: item.status,
            name_dish: item.dish.name,
            type: item.dish.type,
            description: item.dish.description || '',
            price: item.dish.price,
            isAvailable: item.dish.isAvailable,
            imageUrl: item.dish.imageUrl || '',
            prepTime: item.dish.prepTime
        }));

        return res.status(200).json({
            success: true,
            data: flatItems
        });

    } catch (error) {
        console.error("Error in getAllToPanel:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};


