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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reqWithTimeout = exports.timeoutAfter = exports.DEFAULT_TIMEOUT_SEC = void 0;
exports.DEFAULT_TIMEOUT_SEC = 10;
function timeoutAfter(seconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error("timeout"));
            }, seconds * 1000);
        });
    });
}
exports.timeoutAfter = timeoutAfter;
function reqWithTimeout(promise, seconds = exports.DEFAULT_TIMEOUT_SEC) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield Promise.race([timeoutAfter(seconds), promise]);
            return response;
        }
        catch (error) {
            console.error(error.message);
        }
    });
}
exports.reqWithTimeout = reqWithTimeout;
//# sourceMappingURL=timeout.js.map