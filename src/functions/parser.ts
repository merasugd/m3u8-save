import * as hls from 'hls-parser';
import * as url from 'node:url';
import path from 'path';
import fs from 'fs';

import download from './download';

function parse(
  streamUrl: string,
  quality = 'highest',
  cache = path.join(require('os').tmpdir(), 'm3u8dl')
): Promise<any> {
  return new Promise(async resolve => {
    if (fs.existsSync(cache)) fs.rmSync(cache, {recursive: true, force: true});
    fs.mkdirSync(cache);

    const parsed = await parse_m3u8(streamUrl, cache);

    if (
      parsed.segments &&
      Array.isArray(parsed.segments) &&
      parsed.segments.length > 0
    ) {
      return resolve(
        parsed.segments
          .filter((v: any) => v.type === 'segment')
          .map((v: any) => {
            if (isUrl(v.uri)) return v;

            v.uri = new url.URL(v.uri, streamUrl).href;

            return v;
          })
      );
    } else if (
      parsed.variants &&
      Array.isArray(parsed.variants) &&
      parsed.variants.length > 0
    ) {
      const filtered = parsed.variants.filter((v: any) => v.bandwidth && v.uri);
      const sorted = filtered.sort(
        (a: any, b: any) => a.bandwidth - b.bandwidth
      );

      const fetched = filter(sorted, quality);
      const uri = new url.URL(fetched.uri, streamUrl).href;

      return resolve(await parse(uri, quality, cache));
    }
  });
}

function parse_m3u8(uri: string, cache: string): Promise<any> {
  return new Promise(async resolve => {
    const main = path.join(cache, '.master.m3u8');
    const json = path.join(cache, '.master.m3u8.json');

    const dl_r1 = await download(uri, main);
    if (dl_r1 !== 100) return resolve(dl_r1);

    const parsed = hls.parse(fs.readFileSync(main, {encoding: 'utf-8'}));
    fs.writeFileSync(json, JSON.stringify(parsed, null, 4));

    return resolve(JSON.parse(fs.readFileSync(json, {encoding: 'utf-8'})));
  });
}

function filter(all: any[], quality: string): any {
  if (quality === 'highest') {
    return all[all.length - 1];
  } else if (quality === 'lowest') {
    return all[0];
  } else if (quality === 'medium') {
    return all[Math.floor(all.length / 2)];
  } else return null;
}

function isUrl(input: string): boolean {
  try {
    new url.URL(input);
    return true;
  } catch (_) {
    return false;
  }
}

export default parse;
