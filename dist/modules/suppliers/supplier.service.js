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
exports.supplierService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const app_error_1 = require("../../shared/errors/app-error");
const supplier_repository_1 = require("./supplier.repository");
const ensureId = (id) => {
    if (!mongoose_1.default.isValidObjectId(id))
        throw new app_error_1.AppError("Invalid supplier id", 400);
};
exports.supplierService = {
    list() {
        return supplier_repository_1.supplierRepository.list();
    },
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const supplier = yield supplier_repository_1.supplierRepository.findById(id);
            if (!supplier)
                throw new app_error_1.AppError("Supplier not found", 404);
            return supplier;
        });
    },
    create(payload) {
        return supplier_repository_1.supplierRepository.create({
            name: payload.name,
            phone: payload.phone,
            email: payload.email,
            address: payload.address,
            contactPerson: payload.contactPerson,
            isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        });
    },
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const supplier = yield supplier_repository_1.supplierRepository.update(id, payload);
            if (!supplier)
                throw new app_error_1.AppError("Supplier not found", 404);
            return supplier;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const supplier = yield supplier_repository_1.supplierRepository.remove(id);
            if (!supplier)
                throw new app_error_1.AppError("Supplier not found", 404);
            return { msg: "Supplier deleted successfully." };
        });
    },
};
