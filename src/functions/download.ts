import fs from 'fs';
import fsp from 'fs/promises';
import axios from 'axios';

import {error} from './error';

async function dl(
  uri: string,
  out: string,
  retries = 3,
  backoff = 1000
): Promise<number> {
  try {
    if (fs.existsSync(out)) await fsp.rm(out, {recursive: true, force: true});

    const response = await axios({
      method: 'GET',
      url: uri,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      },
    });

    if (!response.data) return secondDl(uri, out, retries, backoff);

    const outStr = fs.createWriteStream(out);

    response.data.pipe(outStr);

    return new Promise(resolve => {
      outStr.on('finish', () => resolve(100));
      response.data.on('error', () =>
        resolve(secondDl(uri, out, retries, backoff))
      );
    });
  } catch (e) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, backoff));
      return dl(uri, out, retries - 1, backoff * 2);
    }
    return secondDl(uri, out, retries, backoff);
  }
}

async function secondDl(
  uri: string,
  out: string,
  retries = 3,
  backoff = 1000
): Promise<number> {
  try {
    if (fs.existsSync(out)) await fsp.rm(out, {recursive: true, force: true});

    const response = await axios({
      method: 'GET',
      url: uri,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      },
    });

    if (!response.data) throw new Error('Failed to get data');

    const outStr = fs.createWriteStream(out);

    response.data.pipe(outStr);

    return new Promise((resolve, reject) => {
      outStr.on('finish', () => resolve(100));
      response.data.on('error', async (err: any) => {
        if (retries > 0) {
          await new Promise(res => setTimeout(res, backoff));
          return resolve(secondDl(uri, out, retries - 1, backoff * 2));
        }
        reject(new error(String(err)));
      });
    });
  } catch (e) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, backoff));
      return secondDl(uri, out, retries - 1, backoff * 2);
    }
    throw new error(String(e));
  }
}

export default dl;
