// CSS-first import rule: the UI library styles MUST be the first import.
import "@macropaytd/lib-front-ui-components/styles.css"

import React from "react"
import ReactDOM from "react-dom/client"
import { App } from "./App"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
