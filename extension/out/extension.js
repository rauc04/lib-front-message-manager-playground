"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Carpeta (dentro del paquete de la extensión) donde queda el build estático
 * del playground. La poblamos con `copy-webview.ts` a partir del `dist/` de Vite.
 */
const WEBVIEW_DIR = "webview";
function activate(context) {
    const disposable = vscode.commands.registerCommand("messageManagerPlayground.open", () => {
        const panel = vscode.window.createWebviewPanel("messageManagerPlayground", "Message Manager Playground", vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, WEBVIEW_DIR),
            ],
        });
        panel.webview.html = getWebviewHtml(context, panel.webview);
    });
    context.subscriptions.push(disposable);
}
/**
 * Lee el index.html compilado por Vite y reescribe las rutas relativas de los
 * assets (`./assets/...`) a URIs de webview, además de inyectar una CSP con
 * nonce para permitir solo los scripts de la propia extensión.
 */
function getWebviewHtml(context, webview) {
    const webviewRoot = vscode.Uri.joinPath(context.extensionUri, WEBVIEW_DIR);
    const indexPath = path.join(webviewRoot.fsPath, "index.html");
    if (!fs.existsSync(indexPath)) {
        return fallbackHtml();
    }
    let html = fs.readFileSync(indexPath, "utf8");
    const nonce = getNonce();
    // Reescribe src="./x" y href="./x" (o "/x") a URIs de webview.
    html = html.replace(/(src|href)="(\.?\/[^"]+)"/g, (_match, attr, assetPath) => {
        const normalized = assetPath.replace(/^\.?\//, "");
        const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, normalized));
        return `${attr}="${assetUri}"`;
    });
    // Añade nonce a todas las etiquetas <script> para cumplir con la CSP.
    html = html.replace(/<script /g, `<script nonce="${nonce}" `);
    const csp = [
        `default-src 'none'`,
        `img-src ${webview.cspSource} data: https:`,
        `font-src ${webview.cspSource} data:`,
        `style-src ${webview.cspSource} 'unsafe-inline'`,
        `script-src 'nonce-${nonce}'`,
    ].join("; ");
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
    html = html.replace(/<head>/, `<head>\n    ${cspMeta}`);
    return html;
}
function fallbackHtml() {
    return `<!doctype html><html><body style="font-family: sans-serif; padding: 2rem;">
    <h2>Message Manager Playground</h2>
    <p>No se encontró el build del webview. Ejecuta <code>npm run build:webview</code>
    en la carpeta <code>extension/</code> y vuelve a empaquetar la extensión.</p>
  </body></html>`;
}
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
function deactivate() { }
//# sourceMappingURL=extension.js.map