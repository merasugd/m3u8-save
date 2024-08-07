import cp from 'child_process';
import ffmpeg from 'ffmpeg-static';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import url from 'url';
import {v4 as uuid} from 'uuid';
import {error as M3U8Error} from './error';
import dl from './download';
import codec from 'langs';

import {Caption} from '../utils/types';

export default function processVideo(
  input: string,
  output: string,
  ffmpegPath: string = ffmpeg || '',
  captions: Caption[] = [],
  cache: string = path.join(require('os').tmpdir(), 'm3u8dl')
): Promise<number | M3U8Error> {
  return new Promise(async resolve => {
    const tsToVideo = await ffmpegRun(
      ['-i', input, '-c', 'copy', output],
      ffmpegPath
    );
    if (tsToVideo !== 100) return resolve(tsToVideo);

    if (fs.existsSync(input)) fs.rmSync(input, {force: true});

    if (captions && captions.length > 0) {
      await captionsLoop(output, cache, ffmpegPath, captions, 0);
    }

    if (fs.existsSync(cache))
      await fsp.rm(cache, {recursive: true, force: true});

    return resolve(100);
  });
}

async function captionsLoop(
  vid: string,
  cache: string,
  ffmpegPath: string,
  arr: Caption[],
  i: number
): Promise<number | M3U8Error> {
  const item = arr[i];

  if (!item || i >= arr.length) return 100;

  await addCaptionToVideo(item.uri, vid, item.lang, cache, ffmpegPath);

  return captionsLoop(vid, cache, ffmpegPath, arr, i + 1);
}

function ffmpegRun(
  args: string[],
  ffmpegPath: string = ffmpeg || ''
): Promise<number | M3U8Error> {
  return new Promise(resolve => {
    const proc = cp.spawn(ffmpegPath, args);

    proc.on('error', err => {
      resolve(new M3U8Error(err.message));
    });
    proc.on('close', () => resolve(100));

    //proc.stderr.on('data', (d) => console.log(d.toString()));
  });
}

async function addCaptionToVideo(
  caption: string,
  video: string,
  lang = 'english',
  cache: string = path.join(require('os').tmpdir(), 'm3u8dl'),
  ffmpegPath: string = ffmpeg || ''
): Promise<number | M3U8Error> {
  const captionsPath = path.join(cache, `${lang}.srt`);
  const withoutSub = path.join(
    cache,
    `temp-${uuid()}-without-subtitle${path.extname(video)}`
  );
  let temp: string | null = null;

  await fsp.writeFile(withoutSub, fs.readFileSync(video));

  if (isUrl(caption)) {
    const parsedUrl = url.parse(caption, false);
    const pathName = parsedUrl.pathname || '.srt';
    const extension = path.extname(pathName);
    const tempCaption = path.join(cache, `${lang}${extension}`);

    temp = tempCaption;

    const dler = await dl(caption, tempCaption);
    if (dler !== 100) return dler;
  } else if (isPath(caption)) {
    temp = caption;
  } else return new M3U8Error('BAD CAPTIONS');

  if (path.extname(caption) === path.extname(captionsPath))
    return addCaption(caption);

  const convertToSrt = await ffmpegRun(['-i', temp, captionsPath], ffmpegPath);
  if (convertToSrt !== 100) return convertToSrt;

  if (temp && fs.existsSync(temp)) fs.rmSync(temp, {force: true});

  async function addCaption(cpt: string): Promise<number | M3U8Error> {
    const langCodecValue = await langCodec(lang.toLowerCase());
    const addToVideo = await ffmpegRun(
      [
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
      ],
      ffmpegPath
    );

    if (addToVideo !== 100) return addToVideo;
    if (fs.existsSync(withoutSub)) await fsp.rm(withoutSub, {force: true});

    return 100;
  }

  return addCaption(captionsPath);
}

function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch (_) {
    return false;
  }
}

function isPath(input: string): boolean {
  return (
    path.isAbsolute(input) || input.startsWith('.') || input.startsWith('~')
  );
}

function langCodec(lang: string): string {
  const allCodecs = codec.all();
  const fetched = allCodecs.find(v => v.name.toLowerCase() === lang);

  if (!fetched) return 'eng';

  return fetched['2B'];
}

function capitalizeFirstLetter(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
