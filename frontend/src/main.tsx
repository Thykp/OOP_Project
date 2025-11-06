// Polyfill for libraries that expect a Node-like `global` in the browser (e.g. sockjs-client)
;(window as any).global = window

import { ToastRootProvider } from "@/components/ui/toaster"
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import { AuthProvider } from "./context/auth-context"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastRootProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ToastRootProvider>
  </React.StrictMode>
)
