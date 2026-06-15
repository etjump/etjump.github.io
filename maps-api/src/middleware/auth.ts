import { Context, Next } from "hono";
import { timingSafeEqual } from "crypto";

const UPLOAD_SECRET = process.env.UPLOAD_SECRET;

if (!UPLOAD_SECRET) {
  console.warn("WARNING: UPLOAD_SECRET is not set. Protected routes will reject all requests.");
}

export async function requireAuth(c: Context, next: Next) {
  const uploadKey = c.req.header("X-Upload-Key");

  if (!UPLOAD_SECRET) {
    return c.json(
      { success: false, error: "Server misconfigured: no upload secret set" },
      500
    );
  }

  if (
    !uploadKey ||
    uploadKey.length !== UPLOAD_SECRET.length ||
    !timingSafeEqual(Buffer.from(uploadKey), Buffer.from(UPLOAD_SECRET))
  ) {
    return c.json(
      { success: false, error: "Unauthorized: invalid or missing upload key" },
      401
    );
  }

  await next();
}
