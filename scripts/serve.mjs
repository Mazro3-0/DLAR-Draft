import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const root = path.join(project, "dist");
const port = Number(process.env.DLAR_PORT || 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
await fs.access(path.join(root, "index.html")).catch(() => {
  throw Error("The build is missing. Run npm run build first.");
});
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, `http://127.0.0.1:${port}`).pathname,
    );
    const target = path.resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (!target.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const file = await fs.readFile(target);
    response.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.on("error", (error) => {
  console.error(`Could not start the preview: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Deadlock AR Studio: http://127.0.0.1:${port}\nLeave this window open while using the studio. Press Ctrl+C to stop.`,
  ),
);
