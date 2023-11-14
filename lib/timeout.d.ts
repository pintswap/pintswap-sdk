export declare const DEFAULT_TIMEOUT_SEC = 10;
export declare function timeoutAfter(seconds: number): Promise<"timeout">;
export declare function reqWithTimeout(promise: Promise<any>, seconds?: number): Promise<any | "timeout">;
