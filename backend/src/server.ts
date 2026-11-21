// Entry point untuk development lokal (`npm run dev`). Di Vercel yang dipakai default export src/app.ts.
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
createApp().listen(port, () => {
  console.log(`Backend berjalan di http://localhost:${port}`);
});
