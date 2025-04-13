import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../index";

export const CreateDish = async (req: Request, res: Response) => {
    try {
      const { name, description, price, stock, isAvailable = true, category, imageUrl, prepTime } = req.body;
      if (!name || !price || !stock || !category || !prepTime) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      const newDish = await prisma.dish.create({
        data: {
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock),
            isAvailable: isAvailable === "false" ? false : true,
            category,
            imageUrl,
            prepTime: parseInt(prepTime),
            restaurantId: 1,
        },
      });
      return res.status(201).json({ success: true, message: "Dish created successfully", data: newDish });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Error creating dish" });
    }
};

export const GetDishById = async (req: Request, res: Response) => {
    try {
      const dishId = parseInt(req.params.id);
      const dish = await prisma.dish.findUnique({ where: { id: dishId } });
      if (!dish) {
        return res.status(404).json({ success: false, message: "Dish not found" });
      }
      return res.status(200).json({ success: true, data: dish });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error retrieving dish" });
    }
};

export const GetDishs = async (req: Request, res: Response) => {
    try {
      const dishes = await prisma.dish.findMany({});
      return res.status(200).json({ success: true, data: dishes });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Error retrieving dishes" });
    }
}

export const UpdateDish = async (req: Request, res: Response) => {
    try {
      const dishId = parseInt(req.params.id);
      const { name, description, price, stock, isAvailable, category, imageUrl, prepTime,} = req.body;
      const dataToUpdate: any = {};
        if (name !== undefined) dataToUpdate.name = name;
        if (description !== undefined) dataToUpdate.description = description;
        if (price !== undefined) dataToUpdate.price = parseFloat(price);
        if (stock !== undefined) dataToUpdate.stock = parseInt(stock);
        if (isAvailable !== undefined) {
            dataToUpdate.isAvailable = isAvailable === "false" ? false : Boolean(isAvailable);
        }
        if (category !== undefined) dataToUpdate.category = category;
        if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
        if (prepTime !== undefined) dataToUpdate.prepTime = parseInt(prepTime);
      const updatedDish = await prisma.dish.update({
        where: { id: dishId },
        data: dataToUpdate,
      });
      return res.status(200).json({ success: true, message: "Dish updated", data: updatedDish });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error updating dish" });
    }
};

export const DeleteDish = async (req: Request, res: Response) => {
    try {
        const dishId = parseInt(req.params.id);
        await prisma.dish.delete({ where: { id: dishId } });
        return res.status(200).json({ success: true, message: "Dish deleted" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting dish" });
    }
};