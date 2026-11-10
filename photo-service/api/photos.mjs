import { createHandler } from "../lib/handler.mjs";
import { blobStore } from "../lib/blob-store.mjs";
export default {
  fetch: createHandler(blobStore, {
    passwordHash: process.env.ADMIN_PASSWORD_HASH,
    authSecret: process.env.AUTH_SECRET,
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS || "https://dyuits.github.io"
    ).split(","),
  }),
};
