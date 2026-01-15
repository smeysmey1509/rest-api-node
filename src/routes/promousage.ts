import { Router, Request, Response } from "express";
import PromoUsage from "../../models/PromoUsage";
import PromoCode from "../../models/PromoCode";
import { authenticateToken } from "../../middleware/auth";

const router = Router();

router.post("/cart/apply-promo", authenticateToken, async (req: Request | any, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
       res.status(400).json({ error: "Promo code is required." })
       return;
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) {
      res.status(404).json({ error: "Promo code not found or inactive." });
      return;
    }

    if (promo.expiresAt < new Date()) {
      res.status(400).json({ error: "Promo code expired." });
      return;
    }

    const usage = await PromoUsage.findOne({ user: req.user.id, promoCode: promo._id });
    if (usage && usage.usageCount >= promo.maxUsesPerUser) {
      res.status(400).json({ error: `Promo code usage limit reached (${promo.maxUsesPerUser} times).` });
      return;
    }

     res.status(200).json({ message: "Promo code applied successfully." });
     return;
  } catch (err) {
    console.error(err);
     res.status(500).json({ error: "Failed to apply promo code." });
     return;
  }
});

export default router;