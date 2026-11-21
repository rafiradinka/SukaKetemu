import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  // Jangan bocorkan teknologi server lewat header X-Powered-By.
  app.disable("x-powered-by");
  app.use(helmet());

  // Hanya origin yang terdaftar di CORS_ORIGINS (dipisah koma) yang boleh memanggil API.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));

  // Batas body JSON kecil; upload foto akan punya jalur sendiri (FR-02.1).
  app.use(express.json({ limit: "100kb" }));

  app.use("/api", healthRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Error handler: detail error hanya di log server, tidak dikirim ke klien.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}

// Entry point Vercel (zero-config Express): Vercel memakai default export dari src/app.ts.
// Jangan pindahkan import "express" dari file ini, karena Vercel mendeteksi entrypoint lewat import tersebut.
export default createApp();
