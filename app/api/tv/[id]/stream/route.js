// SSE stream for Greeting TV
import prisma from '@/lib/prisma';
import { subscribe } from '@/lib/broadcast';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({ where: { id: p.id }, select: { id: true, tvEnabled: true } });
  if (!inv) return new Response('Not found', { status: 404 });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const write = (chunk) => { try { controller.enqueue(encoder.encode(chunk)); } catch {} };
      write(`event: hello\ndata: {"ok":true}\n\n`);
      const unsub = subscribe(inv.id, write);
      // Heartbeat every 25s so proxies do not close the connection
      const hb = setInterval(() => write(`: ping\n\n`), 25000);
      // Cleanup on client disconnect
      const signal = request.signal;
      const cleanup = () => { clearInterval(hb); unsub(); try { controller.close(); } catch {} };
      if (signal) signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
