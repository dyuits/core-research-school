import { get, put, list, del } from "@vercel/blob";
export const blobStore = {
  get ready() {
    return Boolean(
      process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID
    );
  },
  async readJson(path) {
    const result = await get(path, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).json();
  },
  async readImage(path) {
    const result = await get(path, { access: "private" });
    return result?.statusCode === 200 ? result.stream : null;
  },
  async writeJson(path, data, overwrite = false) {
    await put(path, JSON.stringify(data), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: overwrite,
    });
  },
  async writeImage(path, data) {
    await put(path, data, {
      access: "private",
      contentType: "image/webp",
      addRandomSuffix: false,
    });
  },
  async remove(path) {
    await del(path);
  },
  async list(prefix, cursor) {
    const result = await list({ prefix, cursor, limit: 12 });
    return {
      paths: result.blobs.map(b => b.pathname),
      cursor: result.cursor,
      hasMore: result.hasMore,
    };
  },
};
