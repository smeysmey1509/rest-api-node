"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiResponse = void 0;
const success = (res, data = null, message = "Success", status = 200) => res.status(status).json({
    success: true,
    message,
    data,
});
exports.apiResponse = {
    success,
    created(res, data = null, message = "Created") {
        return success(res, data, message, 201);
    },
    error(res, message = "Error", status = 500, details, code) {
        return res.status(status).json({
            success: false,
            message,
            code,
            details,
        });
    },
};
