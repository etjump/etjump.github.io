import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import mapsRoutes from "./routes/maps";
import { ensureStorageDir } from "./services/storage";

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ success: false, error: "Internal server error" }, 500);
});

// Middleware
app.use("*", logger());

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  "*",
  cors({
    origin: CORS_ORIGINS,
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "X-Upload-Key"],
  })
);

// Health check
app.get("/", (c) => {
  return c.json({
    name: "ETJump Maps API",
    version: "0.1.0",
    status: "ok",
  });
});

// Routes
app.route("/api/maps", mapsRoutes);

// Ensure storage directory exists
try {
  await ensureStorageDir();
} catch (err) {
  console.error("Failed to create storage directories:", err);
  process.exit(1);
}

// Start server
const port = parseInt(process.env.PORT || "3001");

console.log(`ETJump Maps API starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
