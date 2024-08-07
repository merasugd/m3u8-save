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
exports.default = processVideo;
const child_process_1 = __importDefault(require("child_process"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = __importDefault(require("url"));
const uuid_1 = require("uuid");
const error_1 = require("./error");
const download_1 = __importDefault(require("./download"));
const langs_1 = __importDefault(require("langs"));
function processVideo(input, output, ffmpegPath = ffmpeg_static_1.default || '', captions = [], cache = path_1.default.join(require('os').tmpdir(), 'm3u8dl')) {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        const tsToVideo = yield ffmpegRun(['-i', input, '-c', 'copy', output], ffmpegPath);
        if (tsToVideo !== 100)
            return resolve(tsToVideo);
        if (fs_1.default.existsSync(input))
            fs_1.default.rmSync(input, { force: true });
        if (captions && captions.length > 0) {
            yield captionsLoop(output, cache, ffmpegPath, captions, 0);
        }
        if (fs_1.default.existsSync(cache))
            yield promises_1.default.rm(cache, { recursive: true, force: true });
        return resolve(100);
    }));
}
function captionsLoop(vid, cache, ffmpegPath, arr, i) {
    return __awaiter(this, void 0, void 0, function* () {
        const item = arr[i];
        if (!item || i >= arr.length)
            return 100;
        yield addCaptionToVideo(item.uri, vid, item.lang, cache, ffmpegPath);
        return captionsLoop(vid, cache, ffmpegPath, arr, i + 1);
    });
}
function ffmpegRun(args, ffmpegPath = ffmpeg_static_1.default || '') {
    return new Promise(resolve => {
        const proc = child_process_1.default.spawn(ffmpegPath, args);
        proc.on('error', err => {
            resolve(new error_1.error(err.message));
        });
        proc.on('close', () => resolve(100));
        //proc.stderr.on('data', (d) => console.log(d.toString()));
    });
}
function addCaptionToVideo(caption_1, video_1) {
    return __awaiter(this, arguments, void 0, function* (caption, video, lang = 'english', cache = path_1.default.join(require('os').tmpdir(), 'm3u8dl'), ffmpegPath = ffmpeg_static_1.default || '') {
        const captionsPath = path_1.default.join(cache, `${lang}.srt`);
        const withoutSub = path_1.default.join(cache, `temp-${(0, uuid_1.v4)()}-without-subtitle${path_1.default.extname(video)}`);
        let temp = null;
        yield promises_1.default.writeFile(withoutSub, fs_1.default.readFileSync(video));
        if (isUrl(caption)) {
            const parsedUrl = url_1.default.parse(caption, false);
            const pathName = parsedUrl.pathname || '.srt';
            const extension = path_1.default.extname(pathName);
            const tempCaption = path_1.default.join(cache, `${lang}${extension}`);
            temp = tempCaption;
            const dler = yield (0, download_1.default)(caption, tempCaption);
            if (dler !== 100)
                return dler;
        }
        else if (isPath(caption)) {
            temp = caption;
        }
        else
            return new error_1.error('BAD CAPTIONS');
        if (path_1.default.extname(caption) === path_1.default.extname(captionsPath))
            return addCaption(caption);
        const convertToSrt = yield ffmpegRun(['-i', temp, captionsPath], ffmpegPath);
        if (convertToSrt !== 100)
            return convertToSrt;
        if (temp && fs_1.default.existsSync(temp))
            fs_1.default.rmSync(temp, { force: true });
        function addCaption(cpt) {
            return __awaiter(this, void 0, void 0, function* () {
                const langCodecValue = yield langCodec(lang.toLowerCase());
                const addToVideo = yield ffmpegRun([
                    '-i',
                    withoutSub,
                    '-i',
                    cpt,
                    '-map',
                    '0',
                    '-map',
                    '1',
                    '-c',
                    'copy',
                    '-c:s',
                    'mov_text',
                    '-metadata:s:s:1',
                    `title=${capitalizeFirstLetter(lang)}`,
                    '-metadata:s:s:1',
                    `language=${langCodecValue}`,
                    '-y',
                    video,
                ], ffmpegPath);
                if (addToVideo !== 100)
                    return addToVideo;
                if (fs_1.default.existsSync(withoutSub))
                    yield promises_1.default.rm(withoutSub, { force: true });
                return 100;
            });
        }
        return addCaption(captionsPath);
    });
}
function isUrl(input) {
    try {
        new URL(input);
        return true;
    }
    catch (_) {
        return false;
    }
}
function isPath(input) {
    return (path_1.default.isAbsolute(input) || input.startsWith('.') || input.startsWith('~'));
}
function langCodec(lang) {
    const allCodecs = langs_1.default.all();
    const fetched = allCodecs.find(v => v.name.toLowerCase() === lang);
    if (!fetched)
        return 'eng';
    return fetched['2B'];
}
function capitalizeFirstLetter(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
//# sourceMappingURL=transmux.js.map