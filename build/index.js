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
const path_1 = __importDefault(require("path"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const error_1 = require("./functions/error");
const parser_1 = __importDefault(require("./functions/parser"));
const segments_1 = __importDefault(require("./functions/segments"));
const merge_1 = __importDefault(require("./functions/merge"));
const transmux_1 = __importDefault(require("./functions/transmux"));
const typed_events_1 = require("./utils/typed_events");
class M3U8 extends typed_events_1.TypedEventEmitter {
    /**
     * Create an M3U8 Instance Downloader.
     * @constructor
     * @param {Options} opt - Options for instance
     */
    constructor(opt) {
        super();
        const { streamUrl, output, quality, mergedPath, cache, concurrency, ffmpegPath, ffmpegMerge, cb, } = opt;
        const options = {
            streamUrl,
            output,
            quality: String(quality || 'highest').toLowerCase(),
            mergedPath,
            cache: cache || path_1.default.join(require('os').tmpdir(), 'm3u8dl'),
            concurrency: concurrency || 10,
            captions: [],
            ffmpegPath: ffmpegPath || ffmpeg_static_1.default || '',
            ffmpegMerge: ffmpegMerge || false,
            cb: cb || function () { },
        };
        if (!options.streamUrl)
            throw new error_1.error('NO STREAM URL');
        if (!options.output)
            throw new error_1.error('PLEASE PROVIDE AN OUTPUT PATH');
        options.mergedPath =
            options.mergedPath || path_1.default.join(options.cache || '', 'merged.ts');
        this._options = options;
        this.oldEmit = this.emit;
        this.emit = function (event, data) {
            this._options.cb ? this._options.cb(event, data) : '';
            return this.oldEmit(event, data);
        };
    }
    /**
     * Add a caption file.
     * @function
     * @param {string} uri - URI or Path of the caption
     * @param {string} lang - Language of the caption
     */
    addCaption(uri, lang = 'english') {
        var _a;
        (_a = this._options.captions) === null || _a === void 0 ? void 0 : _a.push({
            uri,
            lang,
        });
    }
    /**
     * Starts the download
     * @function
     */
    startDownload() {
        const master = this;
        const captions = this._options.captions;
        master.emit('start');
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            master.emit('parsing');
            const options = master._options;
            const parsedSegments = yield (0, parser_1.default)(options.streamUrl, options.quality, options.cache);
            if (!Array.isArray(parsedSegments)) {
                master.emit('error', parsedSegments);
                return resolve(new error_1.error(parsedSegments));
            }
            master.emit('segments_download:build');
            const data = yield (0, segments_1.default)(parsedSegments, options.streamUrl, options.cache, options.concurrency, (event, data) => {
                return master.emit(`segments_download:${event}`, data);
            });
            if (!data ||
                typeof data !== 'object' ||
                !data.totalSegments ||
                !Array.isArray(data.segments)) {
                master.emit('error', data);
                return resolve(new error_1.error(data));
            }
            master.emit('merging:start', options.mergedPath, options.ffmpegMerge);
            const merged = yield (0, merge_1.default)(data, options.mergedPath, options.ffmpegMerge, options.ffmpegPath);
            if (merged !== 100) {
                master.emit('error', merged);
                return resolve(new error_1.error(String(merged)));
            }
            master.emit('merging:end', options.mergedPath);
            master.emit('conversion:start');
            const toMp4 = yield (0, transmux_1.default)(options.mergedPath || '', options.output, options.ffmpegPath, captions, options.cache);
            if (toMp4 !== 100) {
                master.emit('error', toMp4);
                return resolve(new error_1.error(String(toMp4)));
            }
            master.emit('conversion:end', captions);
            master.emit('end', options);
            if (fs_1.default.existsSync(options.cache || ''))
                yield fs_1.default.promises.rm(options.cache || '', {
                    recursive: true,
                    force: true,
                });
            return resolve(100);
        }));
    }
}
exports.default = M3U8;
//# sourceMappingURL=index.js.map