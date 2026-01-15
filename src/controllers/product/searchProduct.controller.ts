import Product from '../../../models/Product'
import {Request, Response} from 'express';
import redisClient from "../../utils/redisClient";

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
    const query  = req.query.query?.toString().trim() || "";
    const limit = Math.max(parseInt(String(req.query.limit ?? ""), 10) || 10, 1);
    const page = Math.max(parseInt(String(req.query.page ?? ""), 10) || 1, 1);
    const skip = (page - 1) * limit;

    const cacheKey = `products:search:${query}:page=${page}:limit=${limit}`;

    try {
        // 1. Check Redis cache
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            res.status(200).json(JSON.parse(cached));
            return
        }

        if (!query) {
            const emptyResponse = {
                pagination: {
                    total: 0,
                    page,
                    perPage: limit,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: page > 1,
                },
                products: [],
            };
            await redisClient.setEx(cacheKey, 600, JSON.stringify(emptyResponse));
            res.status(200).json(emptyResponse);
            return;
        }

        const filter = { $text: { $search: query as string } };

        const [results, total] = await Promise.all([
            Product.find(
                filter,
                { score: { $meta: "textScore" } }
            )
                .populate("category")
                .populate("seller")
                .sort({ score: { $meta: "textScore" } })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        const response = {
            pagination: {
                total,
                page,
                perPage: limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            products: results,
        };

        await redisClient.setEx(cacheKey, 600, JSON.stringify(response));

        res.status(200).json(response);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed." });
        return
    }
};