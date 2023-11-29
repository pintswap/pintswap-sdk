export const DEFAULT_TIMEOUT_SEC = 60;

export async function timeoutAfter(seconds: number): Promise<"timeout"> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("timeout"));
    }, seconds * 1000);
  });
}

export async function reqWithTimeout(
  promise: Promise<any>,
  seconds: number = DEFAULT_TIMEOUT_SEC
): Promise<any | "timeout"> {
  try {
    const response = await Promise.race([timeoutAfter(seconds), promise]);
    return response;
  } catch (error) {
    return "timeout";
  }
}
