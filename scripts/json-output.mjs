export function writeJsonOutput(value, stream = process.stdout) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      stream.removeListener("close", onClose);
      stream.removeListener("error", onError);
    };
    const settle = (complete, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      complete(value);
    };
    const onClose = () => {
      const error = new Error("Writable stream closed before the write callback completed");
      error.code = "ERR_STREAM_PREMATURE_CLOSE";
      settle(reject, error);
    };
    const onError = (error) => settle(reject, error);

    stream.once("close", onClose);
    stream.once("error", onError);
    try {
      stream.write(output, (error) => {
        if (settled) return;
        if (error) {
          settled = true;
          queueMicrotask(cleanup);
          reject(error);
          return;
        }
        settle(resolve);
      });
    } catch (error) {
      settle(reject, error);
    }
  });
}
