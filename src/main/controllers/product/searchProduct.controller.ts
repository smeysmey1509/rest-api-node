import Product from '../../../models/Product'
import {Request, Response} from 'express';
import redisClient from "../../utils/redisClient";

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
    const query  = req.query.query?.toString().trim() || "";

    const cacheKey = `products:search:${query}`;

    try {
        // 1. Check Redis cache
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.status(200).json(JSON.parse(cached));
            return
        }

        const results = await Product.find(
            { $text: { $search: query as string } },
            { score: { $meta: "textScore" } }
        ).populate("category", "name").populate("seller", "name email");

        const response = { total: results.length, results };

        await redisClient.setEx(cacheKey, 600, JSON.stringify(response));

        res.status(200).json({ products: results, total: results.length });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed." });
        return
    }
};