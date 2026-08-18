import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/theme.css";
import { initStorage } from "./utils/storage";
import { ThemeProvider } from "./context/ThemeContext";
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for auto updates & offline caching
registerSW({ immediate: true });

// Initialize storage AFTER login check
if (sessionStorage.getItem('isLoggedIn') === 'true') {
  initStorage().catch(console.error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
