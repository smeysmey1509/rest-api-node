import Product from "../../models/Product";
import Category from "../../models/Category";
import {publishProductActivity} from '../services/activity.service'
import mongoose from "mongoose";
import {io} from "../server";
import {publishNotificationEvent} from "../services/notification.service";

interface ProductInput {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    seller: string;
    status: string;
    tag: string[];
    image: string[];
    userId?: string;
}

const buffer: ProductInput[] = [];
const MAX_BATCH_SIZE = 500;
const FLUSH_INTERVAL_MS = 100;

function addToBatch(product: ProductInput) {
    buffer.push(product);
    if (buffer.length >= MAX_BATCH_SIZE) {
        flushBuffer();
    }
}

async function flushBuffer() {
    if (buffer.length === 0) return;

    // flush buffer
    const toInsert = buffer.splice(0, buffer.length);
    console.log(`Flushing ${toInsert.length} products to DB...`);

    try {

        const insertedProducts = await Product.insertMany(toInsert, { ordered: true });
        console.log(`Inserted ${insertedProducts.length} products successfully.`);

        // ✅ Emit real-time update for each product
        for (const inserted of insertedProducts) {
            const populatedProduct = await Product.findById(inserted._id)
                .populate("category", "name description")
                .populate("seller", "name email");

            if (populatedProduct) {
                io.emit("product:created", populatedProduct); // 🔥 Real-time emit
            }
        }

        // Group by userId to log activity per user
        const activityMap = new Map<string, ProductInput[]>();
        for (const product of toInsert) {
            const userId = product.userId ?? "unknown";
            if (!activityMap.has(userId)) {
                activityMap.set(userId, []);
            }
            activityMap.get(userId)!.push(product);
        }

        for (const [userId, products] of activityMap.entries()) {
            const enrichedProducts = await Promise.all(
                products.map(async (p) => {
                    const categoryDoc = await Category.findById(p.category).select("name description");
                    return {
                        _id: new mongoose.Types.ObjectId(),
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        stock: p.stock,
                        status: p.status,
                        tag: [p.tag],
                        image: [p.image],
                        category: categoryDoc
                            ? {
                                _id: categoryDoc._id,
                                name: categoryDoc.name,
                                description: categoryDoc.description,
                            }
                            : null,
                    };
                })
            );

            await publishProductActivity({
                user: userId,
                action: "create",
                products: enrichedProducts,
            });
        }
    } catch (err) {
        console.error("Batch insert error:", err);
    }
}

// Periodically flush (in case batch doesn't fill up quickly)
setInterval(flushBuffer, FLUSH_INTERVAL_MS);

export { addToBatch };
