import { Response } from "express";
import Brand from "../../../models/Brand";
import Product from "../../../models/Product";
import { AuthenicationRequest } from "../../../middleware/auth";

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const createBrand = async (req: AuthenicationRequest, res: Response) => {
  try {
    const { name, slug, isActive } = req.body ?? {};
    const linkExisting = String(req.query.linkExisting ?? "0") === "1";

    // basic validation
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    // prepare slug (unique)
    const desiredSlug = (slug && String(slug).trim()) || slugify(name);
    if (!desiredSlug) {
      res.status(400).json({ error: "slug could not be derived from name" });
      return;
    }

    // create
    const brand = await Brand.create({
      name: name.trim(),
      slug: desiredSlug,
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    // Optionally link existing products by legacy string brand (case-insensitive)
    if (linkExisting) {
      await Product.updateMany(
        { brand: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        { $set: { brandRef: brand._id } }
      );
    }

    res.status(201).json(brand);
  } catch (err: any) {
    // Handle duplicate key nicely
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "unique field";
      res.status(409).json({ error: `Brand ${field} already exists.` });
      return;
    }
    console.error("createBrand error:", err);
    res.status(500).json({ error: "Failed to create brand" });
  }
};
