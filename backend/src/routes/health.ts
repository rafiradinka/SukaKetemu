import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "sukaketemu-backend",
    region: process.env.VERCEL_REGION ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    timestamp: new Date().toISOString(),
  });
});
