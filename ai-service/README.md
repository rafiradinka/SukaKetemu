# ai-service

Layanan inferensi embedding multimodal SukaKetemu (Python 3.11 + FastAPI + ONNX Runtime), di-deploy sebagai Docker Space di Hugging Face Spaces.

Isi folder ini dikerjakan pada **ENV-05** (PIC: Ghazali, Radinka). Endpoint yang direncanakan:

- `GET /health`: dipakai pinger keep-alive (ENV-08).
- `POST /embed`: menghasilkan vektor 512-dimensi untuk citra/teks.

File model (`*.onnx`, `*.safetensors`, dll.) tidak di-commit ke repo ini (lihat `.gitignore`); simpan di repo model Hugging Face.
