import React from "react";
import "./index.css";
import App from "./App";
import ReactDOM from "react-dom/client";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
