import "dotenv/config";
import mongoose from "mongoose";
import Product from "../models/Product";

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri || typeof uri !== "string") {
    throw new Error("MONGO_URI is missing. Set it in your .env or pass it inline.");
  }

  await mongoose.connect(uri);

  await Product.updateMany(
    { image: { $exists: true } },
    [
      {
        $set: {
          images: {
            $cond: [
              { $isArray: "$image" }, "$image",
              { $cond: [ { $eq: [{ $type: "$image" }, "string"] }, ["$image"], [] ] }
            ]
          },
          primaryImageIndex: 0
        }
      },
      { $unset: "image" }
    ]
  );

  console.log("Image migration complete.");
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
