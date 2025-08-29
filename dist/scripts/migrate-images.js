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
const Product_1 = __importDefault(require("../models/Product"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = process.env.MONGO_URI;
        if (!uri || typeof uri !== "string") {
            throw new Error("MONGO_URI is missing. Set it in your .env or pass it inline.");
        }
        yield mongoose_1.default.connect(uri);
        yield Product_1.default.updateMany({ image: { $exists: true } }, [
            {
                $set: {
                    images: {
                        $cond: [
                            { $isArray: "$image" }, "$image",
                            { $cond: [{ $eq: [{ $type: "$image" }, "string"] }, ["$image"], []] }
                        ]
                    },
                    primaryImageIndex: 0
                }
            },
            { $unset: "image" }
        ]);
        console.log("Image migration complete.");
        yield mongoose_1.default.disconnect();
    });
}
run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
