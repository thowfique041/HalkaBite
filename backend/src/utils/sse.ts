import { Request, Response } from 'express';

type Cleanup = () => void;

export const openSseStream = (req: Request, res: Response) => {
  let closed = false;
  const cleanups = new Set<Cleanup>();

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.socket?.setKeepAlive(true);
  res.socket?.setTimeout(0);

  const cleanup = () => {
    if (closed) return;
    closed = true;
    cleanups.forEach(callback => {
      try { callback(); } catch { /* cleanup must never crash the server */ }
    });
    cleanups.clear();
  };

  const write = (chunk: string) => {
    if (closed || res.destroyed || res.writableEnded) return false;
    try { return res.write(chunk); }
    catch { cleanup(); return false; }
  };

  const send = (data: unknown, event?: string) => write(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => write(': heartbeat\n\n'), 20000);
  heartbeat.unref();
  cleanups.add(() => clearInterval(heartbeat));

  req.once('aborted', cleanup);
  req.once('close', cleanup);
  res.once('close', cleanup);
  res.once('error', cleanup);

  return {
    send,
    onClose(callback: Cleanup) { if (closed) callback(); else cleanups.add(callback); },
    isClosed: () => closed
  };
};
