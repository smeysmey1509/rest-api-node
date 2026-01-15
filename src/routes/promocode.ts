import { Router, Request, Response } from "express";
import PromoCode from "../../models/PromoCode";
import { authenticateToken } from "../../middleware/auth";

const router = Router();

// Example middleware to check admin role (adjust as needed)
const checkAdmin = (req: any, res: Response, next: Function) => {
  if (req.user?.role !== "admin") {
     res.status(403).json({ error: "Access denied, admin only." });
     return
  }
  next();
};

router.get(
  "/promocode",
  authenticateToken,
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const promos = await PromoCode.find().sort({ expiresAt: 1 }); // sort by expiration date ascending
      res.status(200).json(promos);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch promo codes." });
    }
  }
);

router.post(
  "/promocode/create",
  authenticateToken,
  checkAdmin,
  async (req: any, res: Response): Promise<void> => {
    try {
      const { code, discountType, discountValue, expiresAt, maxUsesPerUser } = req.body;

      if (!code || !discountType || !discountValue || !expiresAt) {
        res.status(400).json({ error: "All fields are required." });
        return;
      }

      if (!["percentage", "fixed"].includes(discountType)) {
        res.status(400).json({ error: "Invalid discountType." });
        return;
      }

      if (maxUsesPerUser !== undefined && (typeof maxUsesPerUser !== "number" || maxUsesPerUser < 1)) {
        res.status(400).json({ error: "maxUsesPerUser must be a positive number." });
        return;
      }

      const existing = await PromoCode.findOne({ code: code.toUpperCase() });
      if (existing) {
        res.status(409).json({ error: "Promo code already exists." });
        return;
      }

      const promo = new PromoCode({
        code: code.toUpperCase(),
        discountType,
        discountValue,
        expiresAt: new Date(expiresAt),
        isActive: true,
        maxUsesPerUser: maxUsesPerUser ?? 1,
      });

      await promo.save();

      res.status(201).json({ message: "Promo code created.", promo });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create promo code." });
    }
  }
);


export default router;
