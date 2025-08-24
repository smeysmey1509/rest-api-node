import { Request, Response } from "express";
import { AuthenicationRequest } from "../../../middleware/auth";
import { addToBatch } from "../../utils/batchInsertQueue";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";

export const createProduct = async (
  req: AuthenicationRequest,
  res: Response
) => {
  try {
    const { name, description, price, stock, status, category, seller, tag } =
      req.body;
    const userInputId = req?.user?.id;

    const files = req.files as Express.Multer.File[] | undefined;

    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      imageUrls = files.map((file) => `/uploads/${file.filename}`);
    }

    addToBatch({
      name,
      description,
      price,
      stock,
      status,
      category,
      seller,
      tag,
      image: imageUrls,
      userId: userInputId,
    });

    await publishNotificationEvent({
      userId: userInputId,
      title: "Created Product",
      message: `Product ${name} has been created.`,
      read: false,
    });

    io.emit("product:created", userInputId);

    res.status(200).json({ msg: "Product added to batch for creation." });
  } catch (err: any) {
    console.error("Error adding product:", err.message);
    res.status(400).json({ error: "Server error create product." });
  }
};
