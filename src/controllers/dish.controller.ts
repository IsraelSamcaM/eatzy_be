import { Request, Response } from "express";
import { DishCategory, DishType, Prisma } from "@prisma/client";
import { prisma } from "../index";
import { database } from "firebase-admin";

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

export const GetDishesWithPagination = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query as { page?: string; limit?: string };
    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 10;

    const dishes = await prisma.dish.findMany({
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
    });

    const total = await prisma.dish.count();
    return res.status(200).json({ 
      success: true, 
      data: dishes,
      message: `Total: ${total}, Page: ${pageNumber}, Limit: ${limitNumber}, TotalPages: ${Math.ceil(total / limitNumber)}`
    });
  } catch (error) {
    console.error("Error retrieving dishes:", error);
    return res.status(500).json({ success: false, message: "Error retrieving dishes" });
  }
}

export const GetDishes = async (req: Request, res: Response) => {
  try {
    const { isAvailable, category } = req.query as { isAvailable?: string; category?: string };
    const upperCategory = category?.toUpperCase().trim();
    let whereCondition: any = {};
    if (upperCategory && !Object.values(DishCategory).includes(upperCategory as DishCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${Object.values(DishCategory).join(", ")}`,
      });
    }else{
      whereCondition.category = upperCategory;
    }
    
    if (isAvailable !== undefined) {
      whereCondition.isAvailable = isAvailable === "true";
    }
    const dishes = await prisma.dish.findMany({
      where: whereCondition,
      orderBy: {
        name: 'asc',
      },
    });
    return res.status(200).json({ success: true, message: "Dishes fetched successfully", data: dishes });
  } catch (error) {
    console.error("GetDishes error:", error);
    return res.status(500).json({ success: false, message: "Error fetching dishes" });
  }
};

export const filterDishes = async (req: Request, res: Response) => {
  try {
    const { category, type, search } = req.query as { category?: string; type?: string; search?: string; isAvailable?: string };
    const isAvailable = req.query.isAvailable === "true" ? true : false;
    const upperType = type?.toUpperCase().trim();
    const upperCategory = category?.toUpperCase().trim();
    const searchTerm = search?.trim();

    if (!upperType && !upperCategory && !searchTerm) {
      const dishes = await prisma.dish.findMany({});
      return res.status(200).json({ success: true, message: "Fields such as category or type or search are missing", data: dishes });
    }

    if (upperType && !Object.values(DishType).includes(upperType as DishType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be one of: ${Object.values(DishType).join(", ")}`,
      });
    }

    if (upperCategory && !Object.values(DishCategory).includes(upperCategory as DishCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${Object.values(DishCategory).join(", ")}`,
      });
    }

    const dishes = await prisma.dish.findMany({
      where: {
        AND: [
          upperType ? { type: upperType as DishType } : {},
          upperCategory ? { category: upperCategory as DishCategory } : {},
          searchTerm
            ? {
                OR: [
                  { name: { contains: searchTerm, mode: "insensitive" } },
                  { description: { contains: searchTerm, mode: "insensitive" } },
                ],
              }
            : {},
            req.query.isAvailable !== undefined ? { isAvailable: isAvailable } : {},
        ],
      },
    });
    return res.status(200).json({ success: true, message: "Dishes fetched successfully", data: dishes });
  } catch (error) {
    console.error("Get dish by category error:", error);
    return res.status(500).json({ success: false, message: "Error fetching dishes by category and type" });
  }
};

export const UpdateDish = async (req: Request, res: Response) => {
  try {
    const dishId = parseInt(req.params.id);
    const { name, description, price, isAvailable, category, imageUrl, prepTime, type} = req.body;
    const existingDish = await prisma.dish.findUnique({ where: { id: dishId } });
    if (!existingDish) {
      return res.status(404).json({ success: false, message: "Dish not found" });
    }
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
        const dish = await prisma.dish.findUnique({ where: { id: dishId } });
        if (!dish) {
            return res.status(404).json({ success: false, message: "Dish not found" });
        }
        const userRestaurantId = (req as any).user?.restaurantId; 
        if (!userRestaurantId || dish.restaurantId !== userRestaurantId) {
          return res.status(403).json({ success: false, message: "You do not have permission to delete this dish" });
        }
        await prisma.dish.delete({ where: { id: dishId } });
        return res.status(200).json({ success: true, message: "Dish deleted" });
      } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Error deleting dish" });
    }
};