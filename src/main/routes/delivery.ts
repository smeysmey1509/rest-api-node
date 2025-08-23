import { Router, Request, Response } from "express";
import DeliverySetting from "../../models/DeliverySetting";
import { authenticateToken } from "../../middleware/auth";
import { generatePickupCode } from "../utils/pickupCode";

const router = Router();

router.get("/delivery", authenticateToken, async (req: any, res: Response) => {
  try {
    const settings = await DeliverySetting.find();
    res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch delivery methods." });
  }
});

router.post("/delivery", authenticateToken, async (req: any, res: Response) => {
  try {
    const { method, baseFee, freeThreshold, estimatedDays, isActive } = req.body;

    if (!method || baseFee == null || estimatedDays == null) {
        res.status(400).json({ error: "Method, baseFee, and estimatedDays are required." });
        return;
    }

    const exists = await DeliverySetting.findOne({ method });
    if (exists) {
      res.status(400).json({ error: "Delivery method already exists." });
      return;
    }

    const settingData: any = { method, baseFee, freeThreshold, estimatedDays, isActive: isActive ?? true };

    // Only for Pickup method, generate a code template
    if (method.toLowerCase() === "pickup") {
      settingData.code = generatePickupCode();
    }

    const setting = new DeliverySetting(settingData);
    await setting.save();

    res.status(201).json(setting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create delivery method." });
  }
});

router.put("/delivery/edit/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { method, baseFee, freeThreshold, isActive } = req.body;

    const setting = await DeliverySetting.findByIdAndUpdate(
      id,
      { method, baseFee, freeThreshold, isActive },
      { new: true }
    );

    if (!setting) {
      res.status(404).json({ error: "Delivery method not found." });
      return;
    }

    res.status(200).json(setting);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update delivery method." });
  }
});

router.delete("/delivery/remove/:id", authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const setting = await DeliverySetting.findByIdAndDelete(id);

    if (!setting) {
      res.status(404).json({ error: "Delivery method not found." });
      return;
    }

    res.status(200).json({ message: "Delivery method deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete delivery method." });
  }
});

export default router;