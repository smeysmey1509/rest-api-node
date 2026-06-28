import "dotenv/config";
import mongoose from "mongoose";
import "../../packages/shared/src/register-paths";
import { connectDatabase } from "@shared/config/database";
import Brand from "@services/catalog-service/src/modules/brands/brand.model";
import Category from "@services/catalog-service/src/modules/categories/category.model";
import InventoryUnit from "@services/inventory-service/src/modules/inventory-units/inventory-unit.model";
import { inventoryUnitService } from "@services/inventory-service/src/modules/inventory-units/inventory-unit.service";
import ProductVariant from "@services/catalog-service/src/modules/product-variants/product-variant.model";
import Product from "@services/catalog-service/src/modules/products/product.model";
import StockLocation from "@services/inventory-service/src/modules/stock-locations/stock-location.model";
import Supplier from "@services/inventory-service/src/modules/suppliers/supplier.model";
import User from "@services/user-service/src/modules/users/user.model";

const ensureUser = async () => {
  if (process.env.SEED_USER_ID && mongoose.isValidObjectId(process.env.SEED_USER_ID)) {
    const existing = await User.findById(process.env.SEED_USER_ID);
    if (existing) return existing;
  }

  const existing = await User.findOne({ email: "admin@example.com" });
  if (existing) return existing;

  return User.create({
    name: "admin",
    email: "admin@example.com",
    password: "123",
    role: "ADMIN",
    status: "ACTIVE",
  });
};

async function main() {
  await connectDatabase();
  const user = await ensureUser();

  const category = await Category.findOneAndUpdate(
    { categoryId: "phones" },
    { categoryId: "phones", categoryName: "Smartphones", description: "Phones and mobile devices" },
    { upsert: true, new: true }
  );
  const brand = await Brand.findOneAndUpdate(
    { slug: "asus" },
    { name: "ASUS", slug: "asus", isActive: true },
    { upsert: true, new: true }
  );
  const location = await StockLocation.findOneAndUpdate(
    { code: "PP-POS-01" },
    { name: "Phnom Penh POS Branch", code: "PP-POS-01", type: "POS_BRANCH", address: "Phnom Penh", isActive: true },
    { upsert: true, new: true }
  );
  const supplier = await Supplier.findOneAndUpdate(
    { email: "sales@asus-supplier.example" },
    {
      name: "ASUS Authorized Supplier",
      phone: "+85510000000",
      email: "sales@asus-supplier.example",
      address: "Phnom Penh",
      contactPerson: "Supplier Account Manager",
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const product = await Product.findOneAndUpdate(
    { productCode: "ASUS-ROG-ZENFONE-10" },
    {
      productCode: "ASUS-ROG-ZENFONE-10",
      name: "ASUS ROG Zenfone 10",
      slug: "asus-rog-zenfone-10",
      description: "Compact ASUS gaming phone for POS serialized inventory examples.",
      features: ["5.9-inch AMOLED", "Snapdragon 8 series", "IP68", "Gaming performance"],
      brand: brand._id,
      brandId: brand._id,
      category: category._id,
      categoryId: category._id,
      seller: user._id,
      createdBy: user._id,
      productType: "PHONE",
      trackingType: "SERIAL",
      status: "ACTIVE",
      tag: ["asus", "rog", "phone"],
      tags: ["asus", "rog", "phone"],
      price: 999,
      stock: 0,
      currency: "USD",
      images: [{ url: "/uploads/examples/asus-rog-zenfone-10-blue.jpg", alt: "ASUS ROG Zenfone 10 Blue", isPrimary: true, sortOrder: 0 }],
      attributes: { chipset: "Snapdragon 8 Gen 2", display: "AMOLED" },
      seo: { title: "ASUS ROG Zenfone 10", description: "Serialized ASUS ROG Zenfone 10 inventory example", keywords: ["asus", "rog", "zenfone"] },
    },
    { upsert: true, new: true, runValidators: true }
  );

  const variant = await ProductVariant.findOneAndUpdate(
    { sku: "ASUS-ROG-Z10-BLUE-128" },
    {
      productId: product._id,
      sku: "ASUS-ROG-Z10-BLUE-128",
      barcode: "8850000000010",
      optionValues: { color: "Blue", storage: "128GB", ram: "16GB" },
      pricing: { currency: "USD", salePrice: 999, compareAtPrice: 1099, dealerPrice: 950, costPrice: 900 },
      images: [{ url: "/uploads/examples/asus-rog-z10-blue-128.jpg", alt: "Blue 128GB", isPrimary: true, sortOrder: 0 }],
      isActive: true,
    },
    { upsert: true, new: true, runValidators: true }
  );

  const existing = await InventoryUnit.countDocuments({ variantId: variant._id });
  if (existing === 0) {
    await inventoryUnitService.stockIn(
      {
        productId: product._id,
        variantId: variant._id,
        locationId: location._id,
        supplierId: supplier._id,
        costPrice: 900,
        currency: "USD",
        warrantyMonths: 12,
        units: [
          { serialNumber: "SN-ASUS-0001", imei1: "356789111111111", imei2: "356789111111112" },
          { serialNumber: "SN-ASUS-0002", imei1: "356789222222222" },
          { serialNumber: "SN-ASUS-0003", imei1: "356789333333333" },
        ],
      },
      String(user._id)
    );
  }

  console.log("Serialized inventory example seeded", {
    productId: product._id,
    variantId: variant._id,
    locationId: location._id,
    supplierId: supplier._id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
