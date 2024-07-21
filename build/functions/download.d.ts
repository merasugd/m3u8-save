declare function dl(uri: string, out: string, retries?: number, backoff?: number): Promise<number>;
export default dl;
