"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("../config/database");
const brand_model_1 = __importDefault(require("../modules/brands/brand.model"));
const category_model_1 = __importDefault(require("../modules/categories/category.model"));
const inventory_unit_model_1 = __importDefault(require("../modules/inventory-units/inventory-unit.model"));
const inventory_unit_service_1 = require("../modules/inventory-units/inventory-unit.service");
const product_variant_model_1 = __importDefault(require("../modules/product-variants/product-variant.model"));
const product_model_1 = __importDefault(require("../modules/products/product.model"));
const stock_location_model_1 = __importDefault(require("../modules/stock-locations/stock-location.model"));
const supplier_model_1 = __importDefault(require("../modules/suppliers/supplier.model"));
const user_model_1 = __importDefault(require("../modules/users/user.model"));
const ensureUser = () => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.SEED_USER_ID && mongoose_1.default.isValidObjectId(process.env.SEED_USER_ID)) {
        const existing = yield user_model_1.default.findById(process.env.SEED_USER_ID);
        if (existing)
            return existing;
    }
    const existing = yield user_model_1.default.findOne({ email: "inventory-admin@example.com" });
    if (existing)
        return existing;
    return user_model_1.default.create({
        name: "Inventory Admin",
        email: "inventory-admin@example.com",
        password: "ChangeMe123!",
        role: "ADMIN",
        status: "ACTIVE",
    });
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, database_1.connectDatabase)();
        const user = yield ensureUser();
        const category = yield category_model_1.default.findOneAndUpdate({ categoryId: "phones" }, { categoryId: "phones", categoryName: "Smartphones", description: "Phones and mobile devices" }, { upsert: true, new: true });
        const brand = yield brand_model_1.default.findOneAndUpdate({ slug: "asus" }, { name: "ASUS", slug: "asus", isActive: true }, { upsert: true, new: true });
        const location = yield stock_location_model_1.default.findOneAndUpdate({ code: "PP-POS-01" }, { name: "Phnom Penh POS Branch", code: "PP-POS-01", type: "POS_BRANCH", address: "Phnom Penh", isActive: true }, { upsert: true, new: true });
        const supplier = yield supplier_model_1.default.findOneAndUpdate({ email: "sales@asus-supplier.example" }, {
            name: "ASUS Authorized Supplier",
            phone: "+85510000000",
            email: "sales@asus-supplier.example",
            address: "Phnom Penh",
            contactPerson: "Supplier Account Manager",
            isActive: true,
        }, { upsert: true, new: true });
        const product = yield product_model_1.default.findOneAndUpdate({ productCode: "ASUS-ROG-ZENFONE-10" }, {
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
        }, { upsert: true, new: true, runValidators: true });
        const variant = yield product_variant_model_1.default.findOneAndUpdate({ sku: "ASUS-ROG-Z10-BLUE-128" }, {
            productId: product._id,
            sku: "ASUS-ROG-Z10-BLUE-128",
            barcode: "8850000000010",
            optionValues: { color: "Blue", storage: "128GB", ram: "16GB" },
            pricing: { currency: "USD", salePrice: 999, compareAtPrice: 1099, dealerPrice: 950, costPrice: 900 },
            images: [{ url: "/uploads/examples/asus-rog-z10-blue-128.jpg", alt: "Blue 128GB", isPrimary: true, sortOrder: 0 }],
            isActive: true,
        }, { upsert: true, new: true, runValidators: true });
        const existing = yield inventory_unit_model_1.default.countDocuments({ variantId: variant._id });
        if (existing === 0) {
            yield inventory_unit_service_1.inventoryUnitService.stockIn({
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
            }, String(user._id));
        }
        console.log("Serialized inventory example seeded", {
            productId: product._id,
            variantId: variant._id,
            locationId: location._id,
            supplierId: supplier._id,
        });
    });
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
}));
