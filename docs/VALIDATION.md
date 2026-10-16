# Delivery validation — 16 October 2026

## Completed checks

- Production frontend script `pnpm build`: passed (TypeScript project check and Vite build).
- ESLint: passed.
- Frontend Vitest: 2 tests passed (upload constraints and prediction response contract).
- FastAPI pytest: 4 tests passed (health/unavailable model, MIME/decode/size/missing upload validation, allowed CORS preflight, bounded request body without Content-Length).
- Playwright: 6 browser tests passed across desktop, 390px mobile, and 320px narrow layouts. Tests visit all six routes under /ProduceAI/, check horizontal overflow, and verify disconnected/invalid-upload behavior.
- Four screenshots captured from the built frontend; desktop homepage, scanner, and mobile layout visually reviewed. No page-level JavaScript exceptions were recorded during capture.
- Python modules compile and structured JSON files parse.

The main JavaScript bundle is approximately 263 kB minified (82 kB gzip). Charts load in a separate approximately 386 kB chunk when needed. These are build artifact sizes, not model performance metrics.

## Local environment

Node 24.19.0, pnpm 11.25.0, Python 3.12. Frontend dependency versions are frozen in frontend/pnpm-lock.yaml. API checks used FastAPI 0.143.3, Starlette 1.8.0, Pillow 12.3.0, pytest 9.1.1, and httpx 0.28.1. Starlette emitted an httpx deprecation warning; the four assertions suites passed.

Browser tests used an available Chromium headless shell executable supplied through PLAYWRIGHT_EXECUTABLE_PATH. Because subprocess cleanup is restricted in this local Windows environment, the final browser run used an independently running production preview via PLAYWRIGHT_BASE_URL=http://127.0.0.1:4174/ProduceAI/. The default Playwright configuration starts its own preview for CI; that Linux workflow has not been executed on GitHub in this session.

## Not performed / not claimed

- No dataset was provided or downloaded; no apple model was trained or evaluated.
- PyTorch/scikit-learn/OpenCV training and real-checkpoint inference were not executed here. The shared training/evaluation/inference source is prepared and syntax checked; execute it against an audited dataset before reporting experimental results.
- No model accuracy, precision, recall, F1, defect location, or commercial quality score is claimed.
- No GitHub OAuth authorization, repository creation, commit/push, Pages deployment, backend provisioning, or public URL verification occurred. Follow DEPLOYMENT.md.
- Public-service rate limiting, authentication, real-world field validation, localization, and validated quality scoring remain future work.

The delivered UI reports Model Not Connected and shows empty experiment/history states until real data is available. Screenshots depict those actual states, not sample predictions.
