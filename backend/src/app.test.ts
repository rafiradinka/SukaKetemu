import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("GET /api/health", () => {
  it("mengembalikan status ok", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("tidak mengirim header X-Powered-By", async () => {
    const res = await request(createApp()).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("mengembalikan 404 JSON untuk rute tak dikenal", async () => {
    const res = await request(createApp()).get("/api/tidak-ada");
    expect(res.status).toBe(404);
  });
});
