import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../index";
import { uploadImageBuffer } from "../shared/imageMethods";

export const CreateRestaurant = async (req: Request, res: Response) => {
    try {
      const { name, address, phone } = req.body;
      const file = req.file;
  
      if (!file) {
        return res.status(400).json({ success: false, message: "Logo image is required" });
      }
      const logoUrl = await uploadImageBuffer(file.buffer, "restaurants");
      
      const newRestaurant = await prisma.restaurant.create({
        data: {
          name,
          address,
          phone,
          logoUrl,
        },
      });
  
      res.status(201).json({ success: true, message: "Restaurant created successfully", data: newRestaurant });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error creating restaurant" });
    }
};

export const getRestaurants = async (req: Request, res: Response) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        dishes: true,
      },
    });
    res.status(200).json({ success: true, data: restaurants });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error getting restaurants" });
  }
}
