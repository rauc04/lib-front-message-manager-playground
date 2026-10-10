# Message Manager Playground (extensión)

Empaqueta el **Message Manager Playground** como una extensión de VS Code / Kiro.
Abre el editor visual dentro de un webview para diseñar árboles de componentes de
modales de `@macropaytd/lib-front-fifo-message-manager`.

## Uso

1. Instala el `.vsix` (`Extensions: Install from VSIX...`).
2. Ejecuta el comando **"Abrir Message Manager Playground"** desde la paleta de
   comandos (`Cmd/Ctrl + Shift + P`).

## Cómo generar el `.vsix`

Desde esta carpeta (`extension/`):

```bash
npm install
npm run package
```

Esto:

1. Compila el playground con rutas de assets relativas (`VSCODE_WEBVIEW=1`).
2. Copia el build (`../dist`) a `./webview`.
3. Genera `message-manager-playground-<version>.vsix` con `vsce`.

> El build del playground requiere `NODE_AUTH_TOKEN` (GitHub Packages) y la
> librería hermana en `../../lib-front-fifo-message-manager`, igual que el
> proyecto principal.
