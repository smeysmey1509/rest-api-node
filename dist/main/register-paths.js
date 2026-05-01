"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_module_1 = __importDefault(require("node:module"));
const node_path_1 = __importDefault(require("node:path"));
const sourceRoot = __dirname.endsWith(`${node_path_1.default.sep}main`)
    ? node_path_1.default.resolve(__dirname, "..")
    : __dirname;
const aliasPrefix = "@/";
const originalResolveFilename = node_module_1.default._resolveFilename;
node_module_1.default._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request.startsWith(aliasPrefix)) {
        const resolvedRequest = node_path_1.default.join(sourceRoot, request.slice(aliasPrefix.length));
        return originalResolveFilename.call(this, resolvedRequest, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
};
