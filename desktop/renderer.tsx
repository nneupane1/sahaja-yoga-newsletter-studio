import React from "react";
import { createRoot } from "react-dom/client";
import "../app/globals.css";
import Studio from "../app/page";

createRoot(document.getElementById("root")!).render(<React.StrictMode><Studio /></React.StrictMode>);
