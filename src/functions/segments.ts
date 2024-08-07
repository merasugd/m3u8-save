import path from 'path';
import {URL} from 'url';
import os from 'os';
import fsp from 'fs/promises';

import dl from './download';
import {error} from './error';

import {Segment, ProgressCallback} from '../utils/types';

export default function segment(
  segments: Segment[] = [],
  streamUrl: string,
  cache: string = path.join(os.tmpdir(), 'm3u8dl'),
  maxConnections = 20,
  cb: ProgressCallback = console.log
): Promise<any> {
  return new Promise(async resolve => {
    cb('start', segments);

    const total = segments.length;
    const startSegmentTime = Date.now();
    let current = 0;
    let downloaded = 0;

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
      const segmentPath = path.join(
        cache,
        `downloaded-segment${index}${extension}`
      );

      await sem.take();

      try {
        const dl_r = await dl(seg.uri!, segmentPath);
        if (dl_r !== 100) {
          return resolve(dl_r);
        }

        const byteSize = (await fsp.stat(segmentPath)).size;

        downloaded += byteSize;

        const elapsedSegmentTime = (Date.now() - startSegmentTime) / 1000;
        const averageSegmentSize = downloaded / elapsedSegmentTime;
        const remainingSegments = total - current;
        const remainingTime =
          remainingSegments *
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
        } else if (minutes > 0) {
          eta = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
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
