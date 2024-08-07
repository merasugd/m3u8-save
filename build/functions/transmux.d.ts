import { error as M3U8Error } from './error';
import { Caption } from '../utils/types';
export default function processVideo(input: string, output: string, ffmpegPath?: string, captions?: Caption[], cache?: string): Promise<number | M3U8Error>;
