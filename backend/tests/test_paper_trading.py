import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.database.session import Base
from backend.app.paper_trading.paper_engine import PaperTradingEngine
from backend.app.risk.risk_engine import RiskEngine

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()
    yield db
    db.close()

def test_paper_trading_buy_and_sell(test_db):
    engine = PaperTradingEngine(test_db, RiskEngine())
    
    # 1. Initial Account
    acc = engine.get_account()
    assert acc["cash_balance"] == 100000.0
    assert acc["equity"] == 100000.0
    
    # 2. Place BUY order
    buy_res = engine.place_order(
        symbol="RELIANCE.NS",
        side="BUY",
        quantity=10,
        requested_price=2000.0,
        stop_loss=1970.0,
        target_price=2060.0
    )
    assert buy_res["status"] == "FILLED"
    assert buy_res["quantity"] == 10
    
    # Check account after BUY
    acc_after_buy = engine.get_account()
    assert acc_after_buy["cash_balance"] < 100000.0
    assert acc_after_buy["open_positions_count"] == 1
    
    # 3. Duplicate BUY order prevention
    dup_res = engine.place_order(
        symbol="RELIANCE.NS",
        side="BUY",
        quantity=5,
        requested_price=2000.0
    )
    assert dup_res["status"] == "REJECTED"
    
    # 4. Sell to close
    sell_res = engine.place_order(
        symbol="RELIANCE.NS",
        side="SELL",
        quantity=10,
        requested_price=2050.0  # Profitable exit
    )
    assert sell_res["status"] == "FILLED"
    assert sell_res["realized_pnl"] > 0.0
    
    # Check account after SELL
    acc_after_sell = engine.get_account()
    assert acc_after_sell["open_positions_count"] == 0
    assert acc_after_sell["realized_pnl"] > 0.0
    assert acc_after_sell["total_trades"] == 1
