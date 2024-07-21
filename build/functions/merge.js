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
exports.default = mergeSegments;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const child_process_1 = __importDefault(require("child_process"));
const error_1 = require("./error");
function ffmpegRun(args, ffmpegPath = ffmpeg_static_1.default || '') {
    return new Promise(resolve => {
        const proc = child_process_1.default.spawn(ffmpegPath, args);
        proc.on('error', err => {
            resolve(new error_1.error(err.message));
        });
        proc.on('close', () => resolve(100));
    });
}
function mergeSegments(data, mergedPath = null, ffmpegMerge = false, ffmpegPath = ffmpeg_static_1.default || '') {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        const cache = data.path;
        mergedPath = mergedPath || path_1.default.join(cache, 'merged.ts');
        const segments = data.segments || [];
        if (ffmpegMerge) {
            const to_concat = segments
                .map(v => {
                if (!v.path)
                    return 'filter-please';
                return `file '${v.path}'\n`;
            })
                .filter(v => v !== 'filter-please');
            const concatedPath = path_1.default.join(path_1.default.dirname(mergedPath), 'joined.txt');
            fs_1.default.writeFileSync(concatedPath, to_concat.join(''));
            const procMerge = yield ffmpegRun([
                '-y',
                '-safe',
                '0',
                '-f',
                'concat',
                '-i',
                concatedPath,
                '-c',
                'copy',
                mergedPath,
            ], ffmpegPath);
            if (fs_1.default.existsSync(concatedPath))
                fs_1.default.rmSync(concatedPath, { force: true });
            if (procMerge !== 100)
                return resolve(procMerge);
            return resolve(100);
        }
        const out = fs_1.default.createWriteStream(mergedPath);
        const ret = new Promise(resolve => {
            out.on('finish', () => resolve(100));
            out.on('error', err => resolve(new error_1.error(err.message)));
        });
        try {
            for (const segment of segments) {
                const p = yield put(segment.path, out);
                if (p !== 100)
                    return resolve(new error_1.error('MERGE FAILED: ' + p));
            }
            out.end();
            return resolve(yield ret);
        }
        catch (e) {
            return resolve(new error_1.error(String(e)));
        }
    }));
}
function put(inp, out) {
    return new Promise(resolve => {
        fs_1.default.createReadStream(inp)
            .on('error', err => resolve(new error_1.error(err.message)))
            .on('end', () => resolve(100))
            .pipe(out, { end: false });
    });
}
//# sourceMappingURL=merge.js.map