interface Segment {
    uri?: string;
    path?: string;
}
interface ProgressCallback {
    (type: 'start' | 'progress' | 'end', data?: any): void;
}
export default function segment(segments: Segment[] | undefined, streamUrl: string, cache?: string, maxConnections?: number, cb?: ProgressCallback): Promise<any>;
export {};
