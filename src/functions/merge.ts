import fs from 'fs';
import path from 'path';
import ffmpeg from 'ffmpeg-static';
import cp from 'child_process';
import {error} from './error';

import {Data} from '../utils/types';

function ffmpegRun(
  args: string[],
  ffmpegPath: string = ffmpeg || ''
): Promise<number | error> {
  return new Promise(resolve => {
    const proc = cp.spawn(ffmpegPath, args);

    proc.on('error', err => {
      resolve(new error(err.message));
    });

    proc.on('close', () => resolve(100));
  });
}

export default function mergeSegments(
  data: Data,
  mergedPath: string | null = null,
  ffmpegMerge = false,
  ffmpegPath: string = ffmpeg || ''
): Promise<number | error> {
  return new Promise(async resolve => {
    const cache = data.path;
    mergedPath = mergedPath || path.join(cache, 'merged.ts');
    const segments = data.segments || [];

    if (ffmpegMerge) {
      const to_concat = segments
        .map(v => {
          if (!v.path) return 'filter-please';
          return `file '${v.path}'\n`;
        })
        .filter(v => v !== 'filter-please');

      const concatedPath = path.join(path.dirname(mergedPath), 'joined.txt');
      fs.writeFileSync(concatedPath, to_concat.join(''));

      const procMerge = await ffmpegRun(
        [
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
        ],
        ffmpegPath
      );

      if (fs.existsSync(concatedPath)) fs.rmSync(concatedPath, {force: true});

      if (procMerge !== 100) return resolve(procMerge);

      return resolve(100);
    }

    const out = fs.createWriteStream(mergedPath);
    const ret = new Promise<number | error>(resolve => {
      out.on('finish', () => resolve(100));
      out.on('error', err => resolve(new error(err.message)));
    });

    try {
      for (const segment of segments) {
        const p = await put(segment.path, out);
        if (p !== 100) return resolve(new error('MERGE FAILED: ' + p));
      }

      out.end();
      return resolve(await ret);
    } catch (e) {
      return resolve(new error(String(e)));
    }
  });
}

function put(inp: string, out: fs.WriteStream): Promise<number | error> {
  return new Promise(resolve => {
    fs.createReadStream(inp)
      .on('error', err => resolve(new error(err.message)))
      .on('end', () => resolve(100))
      .pipe(out, {end: false});
  });
}
