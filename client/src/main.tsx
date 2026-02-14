import { createRoot } from "react-dom/client";
import { ConvexProvider } from "convex/react";
import App from "./App";
import { convex } from "./lib/convex";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
if (convex) {
  root.render(
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  );
} else {
  root.render(<App />);
}
