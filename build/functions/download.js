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
const fs_1 = __importDefault(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const axios_1 = __importDefault(require("axios"));
const error_1 = require("./error");
function dl(uri_1, out_1) {
    return __awaiter(this, arguments, void 0, function* (uri, out, retries = 3, backoff = 1000) {
        try {
            if (fs_1.default.existsSync(out))
                yield promises_1.default.rm(out, { recursive: true, force: true });
            const response = yield (0, axios_1.default)({
                method: 'GET',
                url: uri,
                responseType: 'stream',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                },
            });
            if (!response.data)
                return secondDl(uri, out, retries, backoff);
            const outStr = fs_1.default.createWriteStream(out);
            response.data.pipe(outStr);
            return new Promise(resolve => {
                outStr.on('finish', () => resolve(100));
                response.data.on('error', () => resolve(secondDl(uri, out, retries, backoff)));
            });
        }
        catch (e) {
            if (retries > 0) {
                yield new Promise(res => setTimeout(res, backoff));
                return dl(uri, out, retries - 1, backoff * 2);
            }
            return secondDl(uri, out, retries, backoff);
        }
    });
}
function secondDl(uri_1, out_1) {
    return __awaiter(this, arguments, void 0, function* (uri, out, retries = 3, backoff = 1000) {
        try {
            if (fs_1.default.existsSync(out))
                yield promises_1.default.rm(out, { recursive: true, force: true });
            const response = yield (0, axios_1.default)({
                method: 'GET',
                url: uri,
                responseType: 'stream',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                },
            });
            if (!response.data)
                throw new Error('Failed to get data');
            const outStr = fs_1.default.createWriteStream(out);
            response.data.pipe(outStr);
            return new Promise((resolve, reject) => {
                outStr.on('finish', () => resolve(100));
                response.data.on('error', (err) => __awaiter(this, void 0, void 0, function* () {
                    if (retries > 0) {
                        yield new Promise(res => setTimeout(res, backoff));
                        return resolve(secondDl(uri, out, retries - 1, backoff * 2));
                    }
                    reject(new error_1.error(String(err)));
                }));
            });
        }
        catch (e) {
            if (retries > 0) {
                yield new Promise(res => setTimeout(res, backoff));
                return secondDl(uri, out, retries - 1, backoff * 2);
            }
            throw new error_1.error(String(e));
        }
    });
}
exports.default = dl;
//# sourceMappingURL=download.js.map