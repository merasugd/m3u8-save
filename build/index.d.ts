import { error as M3U8Error } from './functions/error';
import { Options, M3U8Events } from './utils/types';
import { TypedEventEmitter } from './utils/typed_events';
declare class M3U8 extends TypedEventEmitter<M3U8Events> {
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
