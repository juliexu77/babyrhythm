import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { clearAppCache } from "./utils/clearAppCache";

// Clear cache on load to ensure fresh data
clearAppCache();

createRoot(document.getElementById("root")!).render(<App />);
