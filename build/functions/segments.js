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
const promises_1 = __importDefault(require("fs/promises"));
const download_1 = __importDefault(require("./download"));
const error_1 = require("./error");
function segment(segments = [], streamUrl, cache = path_1.default.join(os_1.default.tmpdir(), 'm3u8dl'), maxConnections = 20, cb = console.log) {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        cb('start', segments);
        const total = segments.length;
        const startSegmentTime = Date.now();
        let current = 0;
        let downloaded = 0;
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
            const segmentPath = path_1.default.join(cache, `downloaded-segment${index}${extension}`);
            yield sem.take();
            try {
                const dl_r = yield (0, download_1.default)(seg.uri, segmentPath);
                if (dl_r !== 100) {
                    return resolve(dl_r);
                }
                const byteSize = (yield promises_1.default.stat(segmentPath)).size;
                downloaded += byteSize;
                const elapsedSegmentTime = (Date.now() - startSegmentTime) / 1000;
                const averageSegmentSize = downloaded / elapsedSegmentTime;
                const remainingSegments = total - current;
                const remainingTime = remainingSegments *
                    (averageSegmentSize > 0
                        ? downloaded / current / averageSegmentSize
                        : 0);
                let speedUnit = 'B/s';
                let speedValue = averageSegmentSize;
                if (speedValue > 1024) {
                    speedValue /= 1024;
                    speedUnit = 'KB/s';
                }
                if (speedValue > 1024) {
                    speedValue /= 1024;
                    speedUnit = 'MB/s';
                }
                if (speedValue > 1024) {
                    speedValue /= 1024;
                    speedUnit = 'GB/s';
                }
                if (speedValue > 1024) {
                    speedValue /= 1024;
                    speedUnit = 'TB/s';
                }
                const hours = Math.floor(remainingTime / 3600);
                const minutes = Math.floor((remainingTime % 3600) / 60);
                const seconds = Math.floor(remainingTime % 60);
                let eta;
                if (hours > 0) {
                    eta = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                else if (minutes > 0) {
                    eta = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
                else {
                    eta = `00:${String(seconds).padStart(2, '0')}`;
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
                    attribute: {
                        downloadSpeed: {
                            string: `${speedValue.toFixed(2)} ${speedUnit}`,
                            number: parseInt(speedValue.toFixed(2)),
                        },
                        eta: {
                            string: eta,
                            number: Math.floor(remainingTime),
                        },
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