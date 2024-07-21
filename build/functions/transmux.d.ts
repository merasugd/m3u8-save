import { error as M3U8Error } from './error';
interface Caption {
    uri: string;
    lang: string;
}
export default function processVideo(input: string, output: string, ffmpegPath?: string, captions?: Caption[], cache?: string): Promise<number | M3U8Error>;
export {};
