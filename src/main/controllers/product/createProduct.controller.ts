import { Request, Response } from "express";
import {AuthenicationRequest} from "../../../middleware/auth";
import {addToBatch} from "../../utils/batchInsertQueue";
import { io } from "../../server";

export const createProduct = async (req: AuthenicationRequest, res: Response) => {
    try{
        const { name, description, price, stock, status,category, seller, tag } = req.body;
        const userInputId = req?.user?.id

        console.log("req.body:", req.body);
        console.log("req.files:", req.files);

        const files = req.files as Express.Multer.File[] | undefined;

        let imageUrls: string[] = [];

        if (files && files.length > 0) {
            imageUrls = files.map(file => `/uploads/${file.filename}`);
        }

        addToBatch({ name, description, price, stock, status, category, seller, tag, image: imageUrls, userId: userInputId });

        io.emit("product:created", userInputId);

        res.status(200).json({ msg: "Product added to batch for creation." });

    }catch(err:any){
        console.error("Error adding product:", err.message);
        res.status(400).json({ error: "Server error create product." });
    }
}