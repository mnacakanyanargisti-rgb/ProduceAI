import asyncio
import io
import logging
import os
import warnings
from contextlib import asynccontextmanager
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

MAX_BYTES = 8 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000
logger = logging.getLogger(__name__)
predictor = None
inference_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app):
    global predictor
    path = os.getenv("MODEL_PATH", "")
    if path:
        try:
            from ml.inference import Predictor

            predictor = Predictor(path)
        except Exception:
            logger.exception(
                "Checkpoint loading failed; prediction endpoint will remain unavailable"
            )
    yield
    predictor = None


app = FastAPI(title="ProduceAI Inference API", version="1.0.0", lifespan=lifespan)
origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PredictionResponse(BaseModel):
    label: str
    probabilities: dict[str, float]
    model_name: str
    model_version: str
    inference_ms: float


@app.middleware("http")
async def limit_body(request, call_next):
    # Streaming guard caps the entire multipart body, including missing/false Content-Length.
    if request.url.path == "/predict":
        limit = MAX_BYTES + 65536
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > limit:
                from starlette.responses import JSONResponse

                return JSONResponse(
                    {"detail": "Upload exceeds 8 MB image limit."}, status_code=413
                )
        sent = False

        async def receive():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return {"type": "http.disconnect"}

        request._receive = receive
        request._body = bytes(body)
    return await call_next(request)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor is not None,
        "model_name": getattr(predictor, "name", None),
        "model_version": getattr(predictor, "version", None),
        "localization_supported": False,
        "quality_scoring_supported": False,
    }


def decode_image(data):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in {"JPEG", "PNG", "WEBP"}:
                    raise HTTPException(
                        415, "Only JPEG, PNG, and WebP images are supported."
                    )
                image.load()
                return ImageOps.exif_transpose(image).convert("RGB")
    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
        ValueError,
    ):
        raise HTTPException(422, "Invalid, corrupt, or excessively large image.")


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    try:
        if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(415, "Only JPEG, PNG, and WebP images are supported.")
        data = await file.read(MAX_BYTES + 1)
        if not data or len(data) > MAX_BYTES:
            raise HTTPException(413, "Image must be non-empty and at most 8 MB.")
        image = await run_in_threadpool(decode_image, data)
        if predictor is None:
            raise HTTPException(
                503,
                "Model Not Connected. Train a model, set MODEL_PATH, and restart the API.",
            )
        async with inference_lock:
            try:
                return await run_in_threadpool(predictor.predict, image)
            except Exception:
                logger.exception("Inference failed")
                raise HTTPException(500, "Inference failed. Check backend logs.")
    finally:
        await file.close()
