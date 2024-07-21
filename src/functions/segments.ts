import path from 'path';
import {URL} from 'url';
import os from 'os';

import dl from './download';
import {error} from './error';

interface Segment {
  uri?: string;
  path?: string;
}

interface ProgressCallback {
  (type: 'start' | 'progress' | 'end', data?: any): void;
}

export default function segment(
  segments: Segment[] = [],
  streamUrl: string,
  cache: string = path.join(os.tmpdir(), 'm3u8dl'),
  maxConnections = 20,
  cb: ProgressCallback = console.log
): Promise<any> {
  return new Promise(async resolve => {
    cb('start');

    const total = segments.length;
    let current = 0;

    segments = segments.map(v => {
      const uri = v.uri || 'no';

      if (!isUrl(uri)) {
        v.uri = new URL(uri!, streamUrl).href;
      }

      return v;
    });

    const semaphore = (max: number) => {
      let active = 0;
      const waiting: Function[] = [];

      const take = () =>
        new Promise<void>(res => {
          if (active < max) {
            active++;
            res();
          } else {
            waiting.push(res);
          }
        });

      const release = () => {
        if (waiting.length > 0) {
          waiting.shift()!();
        } else {
          active--;
        }
      };

      return {take, release};
    };

    const sem = semaphore(maxConnections);

    const retryDownloadSegment = async (index: number, retries = 3) => {
      const seg = segments[index];
      const parsedUrl = new URL(seg.uri!);
      const pathName = parsedUrl.pathname!;
      const extension = path.extname(pathName);
      const segmentPath = path.join(cache, `segment-${index}${extension}`);

      await sem.take();

      try {
        const dl_r = await dl(seg.uri!, segmentPath);
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
      } catch (e) {
        if (retries > 0) {
          await new Promise(res =>
            setTimeout(res, 1000 * Math.pow(2, 3 - retries))
          );
          return retryDownloadSegment(index, retries - 1);
        } else {
          return resolve(new error(String(e)));
        }
      } finally {
        sem.release();
      }
    };

    try {
      await Promise.all(
        segments.map((_, index) => retryDownloadSegment(index))
      );

      const returnData = {
        totalSegments: total,
        segments,
        path: cache,
      };

      cb('end', returnData);

      return resolve(returnData);
    } catch (e) {
      return resolve(new error(String(e)));
    }
  });
}

function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch (_) {
    return false;
  }
}
