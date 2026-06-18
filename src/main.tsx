import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const redirectPath = sessionStorage.getItem("kross:redirect");
if (redirectPath) {
  sessionStorage.removeItem("kross:redirect");
  window.history.replaceState(null, "", redirectPath);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}
