import events from 'events';
import { error as M3U8Error } from './functions/error';
interface Caption {
    uri: string;
    lang: string;
}
interface Options {
    streamUrl: string;
    output: string;
    quality?: string;
    mergedPath?: string;
    cache?: string;
    concurrency?: number;
    captions?: Caption[];
    ffmpegPath?: string;
    ffmpegMerge?: boolean;
    cb?: (event: string, data: any) => void;
}
declare class M3U8 extends events.EventEmitter {
    private _options;
    private oldEmit;
    /**
     * Create an M3U8 Instance Downloader.
     * @constructor
     * @param {Options} opt - Options for instance
     */
    constructor(opt: Options);
    /**
     * Add a caption file.
     * @function
     * @param {string} uri - URI or Path of the caption
     * @param {string} lang - Language of the caption
     */
    addCaption(uri: string, lang?: string): void;
    /**
     * Starts the download
     * @function
     */
    startDownload(): Promise<number | M3U8Error>;
}
export default M3U8;
