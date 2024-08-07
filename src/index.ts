import fs from 'fs';
import path from 'path';
import ffmpeg from 'ffmpeg-static';

import {error as M3U8Error} from './functions/error';
import parse from './functions/parser';
import segments from './functions/segments';
import merge from './functions/merge';
import transmux from './functions/transmux';

import {Options, M3U8Events} from './utils/types';
import {TypedEventEmitter} from './utils/typed_events';

class M3U8 extends TypedEventEmitter<M3U8Events> {
  private _options: Options;
  private oldEmit: typeof this.emit;

  /**
   * Create an M3U8 Instance Downloader.
   * @constructor
   * @param {Options} opt - Options for instance
   */
  constructor(opt: Options) {
    super();

    const {
      streamUrl,
      output,
      quality,
      mergedPath,
      cache,
      concurrency,
      ffmpegPath,
      ffmpegMerge,
      cb,
    } = opt;
    const options: Options = {
      streamUrl,
      output,
      quality: String(quality || 'highest').toLowerCase(),
      mergedPath,
      cache: cache || path.join(require('os').tmpdir(), 'm3u8dl'),
      concurrency: concurrency || 10,
      captions: [],
      ffmpegPath: ffmpegPath || ffmpeg || '',
      ffmpegMerge: ffmpegMerge || false,
      cb: cb || function () {},
    };

    if (!options.streamUrl) throw new M3U8Error('NO STREAM URL');
    if (!options.output) throw new M3U8Error('PLEASE PROVIDE AN OUTPUT PATH');

    options.mergedPath =
      options.mergedPath || path.join(options.cache || '', 'merged.ts');

    this._options = options;
    this.oldEmit = this.emit;
    this.emit = function (event: string, data: any) {
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
  addCaption(uri: string, lang = 'english') {
    this._options.captions?.push({
      uri,
      lang,
    });
  }

  /**
   * Starts the download
   * @function
   */
  startDownload(): Promise<number | M3U8Error> {
    const master = this;
    const captions = this._options.captions;

    master.emit('start');

    return new Promise(async resolve => {
      master.emit('parsing');

      const options = master._options;
      const parsedSegments = await parse(
        options.streamUrl,
        options.quality,
        options.cache
      );

      if (!Array.isArray(parsedSegments)) {
        master.emit('error', parsedSegments);
        return resolve(new M3U8Error(parsedSegments));
      }

      master.emit('segments_download:build');

      const data = await segments(
        parsedSegments,
        options.streamUrl,
        options.cache,
        options.concurrency,
        (event: string, data: any) => {
          return master.emit(`segments_download:${event}`, data);
        }
      );

      if (
        !data ||
        typeof data !== 'object' ||
        !data.totalSegments ||
        !Array.isArray(data.segments)
      ) {
        master.emit('error', data);
        return resolve(new M3U8Error(data));
      }

      master.emit('merging:start', options.mergedPath, options.ffmpegMerge);

      const merged = await merge(
        data,
        options.mergedPath,
        options.ffmpegMerge,
        options.ffmpegPath
      );
      if (merged !== 100) {
        master.emit('error', merged);
        return resolve(new M3U8Error(String(merged)));
      }

      master.emit('merging:end', options.mergedPath);
      master.emit('conversion:start');

      const toMp4 = await transmux(
        options.mergedPath || '',
        options.output,
        options.ffmpegPath,
        captions,
        options.cache
      );
      if (toMp4 !== 100) {
        master.emit('error', toMp4);
        return resolve(new M3U8Error(String(toMp4)));
      }

      master.emit('conversion:end', captions);
      master.emit('end', options);

      if (fs.existsSync(options.cache || ''))
        await fs.promises.rm(options.cache || '', {
          recursive: true,
          force: true,
        });

      return resolve(100);
    });
  }
}

export default M3U8;
