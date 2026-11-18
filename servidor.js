
const http = require("http");
const fs = require("fs");
const path = require("path");

const PUERTO = 3000;
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png"
};

http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split("?")[0]);
  if (ruta.endsWith("/")) ruta += "index.html";
  const archivo = path.join(__dirname, path.normalize(ruta).replace(/^([\\/.])+/, ""));
  if (!archivo.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(datos);
  });
}).listen(PUERTO, () => console.log("App en http://localhost:" + PUERTO));
