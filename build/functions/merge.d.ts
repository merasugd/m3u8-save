import { error } from './error';
import { Data } from '../utils/types';
export default function mergeSegments(data: Data, mergedPath?: string | null, ffmpegMerge?: boolean, ffmpegPath?: string): Promise<number | error>;
