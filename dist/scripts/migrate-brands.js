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
// scripts/migrate-brands.ts
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../models/Product"));
const Brand_1 = __importDefault(require("../models/Brand"));
const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connect(process.env.MONGO_URI);
    const names = yield Product_1.default.distinct("brand", {
        brand: { $type: "string", $ne: "" },
    });
    for (const name of names) {
        const slug = slugify(name);
        const brandDoc = (yield Brand_1.default.findOne({ slug })) ||
            (yield Brand_1.default.create({ name, slug }));
        // case-insensitive exact match
        yield Product_1.default.updateMany({ brand: new RegExp(`^${name}$`, "i") }, { $set: { brandRef: brandDoc._id } });
    }
    console.log("Migration done");
    yield mongoose_1.default.disconnect();
}))();
