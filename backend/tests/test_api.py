import io
from PIL import Image
from fastapi.testclient import TestClient
from backend.main import app


def image_bytes():
    data = io.BytesIO()
    Image.new("RGB", (32, 32), "red").save(data, format="PNG")
    return data.getvalue()


def test_health_and_unavailable_model(monkeypatch):
    monkeypatch.delenv("MODEL_PATH", raising=False)
    with TestClient(app) as client:
        assert client.get("/health").json()["model_loaded"] is False
        response = client.post(
            "/predict", files={"file": ("apple.png", image_bytes(), "image/png")}
        )
        assert response.status_code == 503
        assert "Model Not Connected" in response.json()["detail"]


def test_upload_validation():
    with TestClient(app) as client:
        assert (
            client.post(
                "/predict", files={"file": ("a.svg", b"<svg/>", "image/svg+xml")}
            ).status_code
            == 415
        )
        assert (
            client.post(
                "/predict", files={"file": ("a.png", b"not an image", "image/png")}
            ).status_code
            == 422
        )
        assert (
            client.post(
                "/predict",
                files={"file": ("a.png", b"x" * (8 * 1024 * 1024 + 1), "image/png")},
            ).status_code
            == 413
        )
        assert client.post("/predict").status_code == 422


def test_cors():
    with TestClient(app) as client:
        response = client.options(
            "/predict",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        assert (
            response.headers["access-control-allow-origin"] == "http://localhost:5173"
        )


def test_total_body_cap_without_content_length():
    with TestClient(app) as client:

        def chunks():
            for _ in range(9):
                yield b"x" * (1024 * 1024)

        response = client.post(
            "/predict",
            content=chunks(),
            headers={"content-type": "multipart/form-data; boundary=test"},
        )
        assert response.status_code == 413
