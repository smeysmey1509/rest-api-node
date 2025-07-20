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
const express_1 = require("express");
const SidebarItem_1 = __importDefault(require("../../models/SidebarItem"));
const router = (0, express_1.Router)();
router.post('/sidebar-items', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, path, icon, order, type, parentId } = req.body;
    const item = new SidebarItem_1.default({ name, path, icon, order, type, parentId });
    yield item.save();
    res.status(200).json({ item });
}));
router.get("/sidebar-tree", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const items = yield SidebarItem_1.default.find().sort({ order: 1 }).lean();
    // Build a tree
    const map = new Map();
    items.forEach(item => map.set(item._id.toString(), Object.assign(Object.assign({}, item), { children: [] })));
    const tree = [];
    items.forEach(item => {
        if (item.parentId) {
            const parent = map.get(item.parentId.toString());
            if (parent) {
                parent.children.push(map.get(item._id.toString()));
            }
        }
        else {
            tree.push(map.get(item._id.toString()));
        }
    });
    res.json(tree);
}));
exports.default = router;
