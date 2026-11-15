# Vercel deployment

Deploy `frontend/` as the Next.js project. Set `NEXT_PUBLIC_API_URL` to the public URL of the separately deployed `backend/` project.

Deploy `backend/` as a Python Vercel project. Its `api/index.py` exports Leon's existing FastAPI app and `vercel.json` routes every request to it. Set `CORS_ORIGINS` on the backend to the frontend's public URL, plus any local development origin.

The current login is intentionally prototype-grade: it creates a local workspace session in the browser and does not claim to authenticate a bank account. Replace it with a real identity provider before handling real financial data.
