"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const hls = __importStar(require("hls-parser"));
const url = __importStar(require("node:url"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const download_1 = __importDefault(require("./download"));
function parse(streamUrl, quality = 'highest', cache = path_1.default.join(require('os').tmpdir(), 'm3u8dl')) {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        if (fs_1.default.existsSync(cache))
            fs_1.default.rmSync(cache, { recursive: true, force: true });
        fs_1.default.mkdirSync(cache);
        const parsed = yield parse_m3u8(streamUrl, cache);
        if (parsed.segments &&
            Array.isArray(parsed.segments) &&
            parsed.segments.length > 0) {
            return resolve(parsed.segments
                .filter((v) => v.type === 'segment')
                .map((v) => {
                if (isUrl(v.uri))
                    return v;
                v.uri = new url.URL(v.uri, streamUrl).href;
                return v;
            }));
        }
        else if (parsed.variants &&
            Array.isArray(parsed.variants) &&
            parsed.variants.length > 0) {
            const filtered = parsed.variants.filter((v) => v.bandwidth && v.uri);
            const sorted = filtered.sort((a, b) => a.bandwidth - b.bandwidth);
            const fetched = filter(sorted, quality);
            const uri = new url.URL(fetched.uri, streamUrl).href;
            return resolve(yield parse(uri, quality, cache));
        }
    }));
}
function parse_m3u8(uri, cache) {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        const main = path_1.default.join(cache, '.master.m3u8');
        const json = path_1.default.join(cache, '.master.m3u8.json');
        const dl_r1 = yield (0, download_1.default)(uri, main);
        if (dl_r1 !== 100)
            return resolve(dl_r1);
        const parsed = hls.parse(fs_1.default.readFileSync(main, { encoding: 'utf-8' }));
        fs_1.default.writeFileSync(json, JSON.stringify(parsed, null, 4));
        return resolve(JSON.parse(fs_1.default.readFileSync(json, { encoding: 'utf-8' })));
    }));
}
function filter(all, quality) {
    if (quality === 'highest') {
        return all[all.length - 1];
    }
    else if (quality === 'lowest') {
        return all[0];
    }
    else if (quality === 'medium') {
        return all[Math.floor(all.length / 2)];
    }
    else
        return null;
}
function isUrl(input) {
    try {
        new url.URL(input);
        return true;
    }
    catch (_) {
        return false;
    }
}
exports.default = parse;
//# sourceMappingURL=parser.js.map