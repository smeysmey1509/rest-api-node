// src/main/controllers/brand/listBrands.controller.ts
import { Response } from "express";
import Brand from "../../../models/Brand";
import { AuthenicationRequest } from "../../../middleware/auth";

function parseSort(input?: string): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};
  (input || "name:1").split(",").forEach(pair => {
    const [field, dir] = pair.split(":");
    if (field) sort[field] = dir === "-1" ? -1 : 1;
  });
  return sort;
}

export const listBrands = async (req: AuthenicationRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page  = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "25"), 10), 1), 100);
    const skip  = (page - 1) * limit;
    const sort  = parseSort(String(req.query.sort ?? "name:1"));

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ];
    }
    if (typeof req.query.isActive !== "undefined") {
      const v = String(req.query.isActive);
      filter.isActive = v === "1" || v.toLowerCase() === "true";
    }

    const [items, total] = await Promise.all([
      Brand.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Brand.countDocuments(filter),
    ]);

    res.status(200).json({
      brands: items,
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("listBrands error:", err);
    res.status(500).json({ error: "Failed to fetch brands" });
  }
};
