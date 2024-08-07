import { Segment, ProgressCallback } from '../utils/types';
export default function segment(segments: Segment[] | undefined, streamUrl: string, cache?: string, maxConnections?: number, cb?: ProgressCallback): Promise<any>;
