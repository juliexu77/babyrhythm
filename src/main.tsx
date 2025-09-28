import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('🏁 Starting main.tsx');
console.log('🔍 Root element:', document.getElementById("root"));

createRoot(document.getElementById("root")!).render(<App />);

console.log('✅ App rendered to root');
