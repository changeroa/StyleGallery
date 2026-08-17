import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pretextDistDirectory = path.resolve(fileURLToPath(new URL('../../node_modules/@chenglou/pretext/dist/', import.meta.url)));

export async function startPretextModuleServer() {
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const relativePath = decodeURIComponent(requestUrl.pathname.slice(1));
    response.setHeader('Access-Control-Allow-Origin', '*');

    if (!/^[a-z0-9._/-]+\.js$/i.test(relativePath) || path.posix.normalize(relativePath) !== relativePath || relativePath.startsWith('/')) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    const modulePath = path.resolve(pretextDistDirectory, relativePath);
    if (!modulePath.startsWith(`${pretextDistDirectory}${path.sep}`)) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    try {
      const body = await fs.readFile(modulePath);
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/javascript; charset=utf-8',
      });
      response.end(body);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Internal server error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref();

  const address = server.address();
  return {
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
    moduleUrl: `http://127.0.0.1:${address.port}/layout.js`,
  };
}

export async function measureTextLinesWithPretext(page, moduleUrl, selector) {
  return page.evaluate(async ({ moduleUrl: browserModuleUrl, selector: browserSelector }) => {
    const { measureLineStats, prepareWithSegments } = await import(browserModuleUrl);

    return [...document.querySelectorAll(browserSelector)].map((line) => {
      const textElement = line.querySelector('em') ?? line;
      const style = getComputedStyle(textElement);
      const letterSpacing = Number.parseFloat(style.letterSpacing);
      const prepared = prepareWithSegments(line.innerText, style.font, {
        letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 0,
        wordBreak: 'keep-all',
      });
      const measurement = measureLineStats(prepared, line.clientWidth);

      return {
        availableWidth: line.clientWidth,
        font: style.font,
        letterSpacing: Number.isFinite(letterSpacing) ? letterSpacing : 0,
        lineCount: measurement.lineCount,
        measuredWidth: measurement.maxLineWidth,
        text: line.innerText,
      };
    });
  }, { moduleUrl, selector });
}
