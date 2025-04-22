import { Request, Response } from "express";
import { DishCategory, DishType, Prisma } from "@prisma/client";
import { prisma } from "../index";

export const CreateDish = async (req: Request, res: Response) => {
  try {
    const {name, description, price ,type, isAvailable, category, imageUrl, prepTime } = req.body;

    const trimmedName = name?.trim();
    const upperType = type?.toUpperCase();
    const upperCategory = category?.toUpperCase();

    // Validar campos requeridos
    if (!trimmedName || !price || !upperType || !upperCategory || !prepTime) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Validar enums
    if (!Object.values(DishType).includes(upperType as DishType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${Object.values(DishType).join(", ")}`,
      });
    }

    if (!Object.values(DishCategory).includes(upperCategory as DishCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${Object.values(DishCategory).join(", ")}`,
      });
    }

    // Verificar nombre duplicado para el restaurante (por ahora hardcoded id = 1)
    const existingDish = await prisma.dish.findFirst({
      where: {
        name: trimmedName,
        restaurantId: 1,
      },
    });

    if (existingDish) {
      return res.status(409).json({
        success: false,
        message: "Dish with the same name already exists",
      });
    }

    const newDish = await prisma.dish.create({
      data: {
        name: trimmedName,
        description: description?.trim(),
        price: parseFloat(price),
        type: upperType as DishType,
        category: upperCategory as DishCategory,
        isAvailable: isAvailable === "false" ? false : true,
        imageUrl: imageUrl?.trim(),
        prepTime: parseInt(prepTime),
        restaurantId: 1, 
      },
    });

    return res.status(201).json({ success: true, message: "Dish created successfully", data: newDish, });
  } catch (error) {
    console.error("CreateDish error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error creating dish" });
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
    const { name, description, price, isAvailable, category, imageUrl, prepTime, type} = req.body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      dataToUpdate.name = name.trim();  
      const existingDish = await prisma.dish.findFirst({
        where: {
          name: dataToUpdate.name,
          restaurantId: 1, 
        },
      });
      if (existingDish) {
        return res.status(409).json({
          success: false,
          message: "Dish with the same name already exists",
        });
      }
    }

    if (description !== undefined) dataToUpdate.description = description?.trim();
    if (price !== undefined) dataToUpdate.price = parseFloat(price);
    
    if (isAvailable !== undefined) {
      dataToUpdate.isAvailable = isAvailable === "false" ? false : Boolean(isAvailable);
    }
    
    if (category !== undefined) {
      const upperCategory = category.trim().toUpperCase();
      if (!Object.values(DishCategory).includes(upperCategory as DishCategory)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${Object.values(DishCategory).join(", ")}`,
        });
      }
      dataToUpdate.category = upperCategory as DishCategory;
    }

    if (type !== undefined) {
      const upperType = type.trim().toUpperCase();
      if (!Object.values(DishType).includes(upperType as DishType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${Object.values(DishType).join(", ")}`,
        });
      }
      dataToUpdate.type = upperType as DishType;
    }

    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl?.trim();
    if (prepTime !== undefined) dataToUpdate.prepTime = parseInt(prepTime);

    const updatedDish = await prisma.dish.update({
      where: { id: dishId },
      data: dataToUpdate,
    });

    return res.status(200).json({ success: true, message: "Dish updated successfully", data: updatedDish });
  } catch (error) {
    console.error("UpdateDish error:", error);
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