import Product from "../models/Product";

interface ProductInput {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: string;
    seller: string;
}

const buffer: ProductInput[] = [];
const MAX_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 100;

function addToBatch(product: ProductInput) {
    buffer.push(product);
    if (buffer.length >= MAX_BATCH_SIZE) {
        flushBuffer();
    }
}

async function flushBuffer() {
    if (buffer.length === 0) return;

    const toInsert = buffer.splice(0, buffer.length); // flush buffer

    try {
        await Product.insertMany(toInsert, { ordered: false });
        console.log(`Inserted ${toInsert.length} products`);
    } catch (err) {
        console.error("Batch insert error:", err);
    }
}

// Periodically flush (in case batch doesn't fill up quickly)
setInterval(flushBuffer, FLUSH_INTERVAL_MS);

export { addToBatch };
