import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "src");
const port = 1420;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function safePath(urlPath = "/") {
  const clean = urlPath.split("?")[0].split("#")[0];
  const normalized = normalize(clean).replace(/^(\.\.[/\\])+/, "");
  const relative = normalized === "/" ? "index.html" : normalized.replace(/^[/\\]/, "");
  return join(root, relative);
}

const server = createServer(async (req, res) => {
  const filePath = safePath(req.url || "/");
  const fallbackPath = join(root, "index.html");
  let pathToUse = fallbackPath;

  if (existsSync(filePath)) {
    try {
      const fileStat = await stat(filePath);
      pathToUse = fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
    } catch {
      pathToUse = fallbackPath;
    }
  }

  if (!existsSync(pathToUse)) {
    pathToUse = fallbackPath;
  }

  const ext = extname(pathToUse).toLowerCase();
  res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
  createReadStream(pathToUse).pipe(res);
});

server.listen(port, "127.0.0.1", async () => {
  try {
    const indexPath = join(root, "index.html");
    await readFile(indexPath, "utf8");
    console.log(`Servidor de desarrollo listo en http://127.0.0.1:${port}`);
  } catch (error) {
    console.error("No se pudo leer src/index.html", error);
    process.exit(1);
  }
});
