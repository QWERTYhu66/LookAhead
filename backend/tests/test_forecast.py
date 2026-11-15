import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.paths import DATA_DEMO, MODEL_PATH, PROFILES_JSON


client = TestClient(app)


def test_health():
    assert client.get("/api/health").json() == {"ok": True}


@pytest.mark.skipif(not PROFILES_JSON.exists(), reason="demo profiles not built yet")
def test_demo_profiles_shape():
    data = client.get("/api/demo-profiles").json()
    assert len(data) == 3
    for row in data:
        assert row["id"].split("_")[0] in {"student", "family", "business"}
        assert row["as_of"] == "2015-11-20"


@pytest.mark.skipif(not (MODEL_PATH.exists() and (DATA_DEMO / "student_a.json").exists()), reason="model/demo not built yet")
def test_student_forecast_shape():
    req = json.loads((DATA_DEMO / "student_a.json").read_text(encoding="utf-8"))
    res = client.post("/api/forecast", json=req)
    assert res.status_code == 200
    body = res.json()
    assert body["as_of"] == "2015-11-20"
    assert body["days_left"] == 10
    assert "predicted" in body["total"]
    assert body["disclaimer"].startswith("This project is a prototype")
    assert body["categories"]
    predicted = [c["predicted"] for c in body["categories"]]
    assert predicted == sorted(predicted, reverse=True)
    for c in body["categories"]:
        assert c["low"] <= c["predicted"] <= c["high"]
        assert c["spent_so_far"] <= c["predicted"] + 1e-6
