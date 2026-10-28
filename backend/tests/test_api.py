import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "NSE" in data["service"]

def test_api_market_status():
    res = client.get("/api/market/status")
    assert res.status_code == 200
    data = res.json()
    assert data["market"] == "NSE"
    assert "session_status" in data

def test_api_watchlist():
    res = client.get("/api/market/watchlist")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
    assert len(items) > 0
    assert any("RELIANCE" in item["symbol"] for item in items)

def test_api_candles():
    res = client.get("/api/market/candles?symbol=RELIANCE.NS&timeframe=5m&limit=30")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "RELIANCE.NS"
    assert len(data["candles"]) > 0

def test_api_paper_account():
    res = client.get("/api/paper/account")
    assert res.status_code == 200
    acc = res.json()
    assert "equity" in acc
    assert "cash_balance" in acc

def test_api_data_sources_status():
    res = client.get("/api/data-sources/status")
    assert res.status_code == 200
    sources = res.json()
    assert len(sources) >= 3
    # Check Kite adapter is explicitly labeled DISABLED
    kite = [s for s in sources if "Kite" in s["provider_name"]]
    assert len(kite) == 1
    assert kite[0]["status"] == "DISABLED"
