import { AuthenicationRequest } from "../../../middleware/auth";
import { Response } from "express";
import Product from "../../../models/Product";
import { publishProductActivity } from "../../services/activity.service";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";

function detectChangedFieldsSummary(original: any, updates: any): string {
  const changes: string[] = [];

  for (const key in updates) {
    let oldValue = original[key];
    let newValue = updates[key];

    // Convert arrays to comma-separated strings
    if (Array.isArray(oldValue)) {
      oldValue = oldValue.join(",");
    }
    if (Array.isArray(newValue)) {
      newValue = newValue.join(",");
    }

    // Convert objects to their 'name' if exists or stringify them
    if (typeof oldValue === "object" && oldValue !== null) {
      oldValue = oldValue.name || JSON.stringify(oldValue);
    }
    if (typeof newValue === "object" && newValue !== null) {
      newValue = newValue.name || JSON.stringify(newValue);
    }

    if (oldValue !== newValue) {
      changes.push(`${key}: "${oldValue}" → "${newValue}"`);
    }
  }

  if (changes.length === 0) {
    return "No changes detected.";
  }

  return "Changes: " + changes.join(", ");
}

export const editProduct = async (
  req: AuthenicationRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    const originalProduct = await Product.findById(id).lean();

    if (!originalProduct) {
      res.status(404).json({ msg: "Product not found" });
      return;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedProduct) {
      res.status(404).json({ msg: "Product not found after update" });
      return;
    }

    const changeSummary = detectChangedFieldsSummary(originalProduct, updates);

    await publishNotificationEvent({
      userId: req?.user?.id,
      title: "Edit Product",
      message: `Product ${updatedProduct?.name} edited. ${changeSummary}`,
      read: false,
    });

    // Fire-and-forget activity logging via RabbitMQ
    publishProductActivity({
      user: userId,
      action: "update",
      products: [
        {
          _id: id,
          ...updates,
        },
      ],
    }).catch((err) => console.error("🐇 Failed to log update activity:", err));

    io.emit("product:edited", updatedProduct);

    res.status(200).json({
      msg: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product." });
  }
};
