// Copia el build estático del playground (../dist) a ./webview, que es lo que
// se empaqueta dentro del .vsix y carga el webview de la extensión.

import * as fs from "fs";
import * as path from "path";

// __dirname en runtime es `extension/out`, así que subimos un nivel para
// resolver rutas relativas a la carpeta `extension/`.
const extensionRoot = path.resolve(__dirname, "..");
const srcDir = path.resolve(extensionRoot, "..", "dist");
const destDir = path.resolve(extensionRoot, "webview");

if (!fs.existsSync(srcDir)) {
  console.error(
    `[copy-webview] No existe ${srcDir}. Ejecuta primero el build del playground.`
  );
  process.exit(1);
}

// Limpia el destino para no arrastrar assets viejos.
fs.rmSync(destDir, { recursive: true, force: true });
fs.cpSync(srcDir, destDir, { recursive: true });

console.log(`[copy-webview] Copiado ${srcDir} -> ${destDir}`);
