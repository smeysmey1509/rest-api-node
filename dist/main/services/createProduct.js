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
// scripts/createProduct.ts
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const form = new form_data_1.default();
        form.append("name", "From Smey");
        form.append("description", "Awesome phone");
        form.append("brand", "Apple");
        form.append("price", "199");
        form.append("compareAtPrice", "249");
        form.append("currency", "USD");
        form.append("stock", "50");
        form.append("status", "Published");
        form.append("category", "68452a18e0434b3fe4c3e66e");
        form.append("seller", "683a98c03e8cc700fa11b180");
        form.append("tag", JSON.stringify(["example", "test"]));
        form.append("attributes", JSON.stringify({ color: "black", storage: "128GB" }));
        form.append("seo", JSON.stringify({ title: "iPhone 15", description: "Best phone", keywords: ["iphone", "apple"] }));
        form.append("variants", JSON.stringify([{ sku: "IPH15-BLK-128", price: 199, stock: 10, attributes: { color: "black", storage: "128GB" } }]));
        form.append("dimensions", JSON.stringify({ length: 150, width: 70, height: 7 }));
        form.append("weight", "500");
        // attach local image
        form.append("images", fs_1.default.createReadStream("./test-image.png"));
        const res = yield axios_1.default.post("http://localhost:3000/api/v1/product", form, {
            headers: Object.assign(Object.assign({}, form.getHeaders()), { Authorization: `Bearer YOUR_JWT_TOKEN` }),
        });
        console.log(res.data);
    });
}
run().catch(console.error);
