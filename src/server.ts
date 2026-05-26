import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { Readable } from 'node:stream';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const apiProxyTarget = process.env['API_PROXY_TARGET'];
if (apiProxyTarget) {
  app.use('/api', async (req, res) => {
    try {
      const targetBase = apiProxyTarget.endsWith('/') ? apiProxyTarget.slice(0, -1) : apiProxyTarget;
      const targetUrl = `${targetBase}${req.originalUrl}`;

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        if (!v) continue;
        const key = k.toLowerCase();
        if (key === 'host' || key === 'connection' || key === 'content-length') continue;
        headers[k] = Array.isArray(v) ? v.join(',') : String(v);
      }

      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? (req as any) : undefined,
        redirect: 'manual',
        duplex: hasBody ? 'half' : undefined,
      } as any);

      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        const k = key.toLowerCase();
        if (k === 'connection' || k === 'transfer-encoding') return;
        res.setHeader(key, value);
      });

      if (!upstream.body) {
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch {
      res.status(502).end();
    }
  });
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
