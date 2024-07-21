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
exports.default = segment;
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const os_1 = __importDefault(require("os"));
const download_1 = __importDefault(require("./download"));
const error_1 = require("./error");
function segment(segments = [], streamUrl, cache = path_1.default.join(os_1.default.tmpdir(), 'm3u8dl'), maxConnections = 20, cb = console.log) {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        cb('start');
        const total = segments.length;
        let current = 0;
        segments = segments.map(v => {
            const uri = v.uri || 'no';
            if (!isUrl(uri)) {
                v.uri = new url_1.URL(uri, streamUrl).href;
            }
            return v;
        });
        const semaphore = (max) => {
            let active = 0;
            const waiting = [];
            const take = () => new Promise(res => {
                if (active < max) {
                    active++;
                    res();
                }
                else {
                    waiting.push(res);
                }
            });
            const release = () => {
                if (waiting.length > 0) {
                    waiting.shift()();
                }
                else {
                    active--;
                }
            };
            return { take, release };
        };
        const sem = semaphore(maxConnections);
        const retryDownloadSegment = (index_1, ...args_1) => __awaiter(this, [index_1, ...args_1], void 0, function* (index, retries = 3) {
            const seg = segments[index];
            const parsedUrl = new url_1.URL(seg.uri);
            const pathName = parsedUrl.pathname;
            const extension = path_1.default.extname(pathName);
            const segmentPath = path_1.default.join(cache, `segment-${index}${extension}`);
            yield sem.take();
            try {
                const dl_r = yield (0, download_1.default)(seg.uri, segmentPath);
                if (dl_r !== 100) {
                    return resolve(dl_r);
                }
                segments[index].path = segmentPath;
                current += 1;
                cb('progress', {
                    uri: seg.uri,
                    path: segmentPath,
                    progress: {
                        total: total,
                        current: current,
                        percentage: Math.floor((current / total) * 100),
                    },
                });
            }
            catch (e) {
                if (retries > 0) {
                    yield new Promise(res => setTimeout(res, 1000 * Math.pow(2, 3 - retries)));
                    return retryDownloadSegment(index, retries - 1);
                }
                else {
                    return resolve(new error_1.error(String(e)));
                }
            }
            finally {
                sem.release();
            }
        });
        try {
            yield Promise.all(segments.map((_, index) => retryDownloadSegment(index)));
            const returnData = {
                totalSegments: total,
                segments,
                path: cache,
            };
            cb('end', returnData);
            return resolve(returnData);
        }
        catch (e) {
            return resolve(new error_1.error(String(e)));
        }
    }));
}
function isUrl(input) {
    try {
        new url_1.URL(input);
        return true;
    }
    catch (_) {
        return false;
    }
}
//# sourceMappingURL=segments.js.map