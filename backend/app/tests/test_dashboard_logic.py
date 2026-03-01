import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
import sys
import os
from fastapi.testclient import TestClient
from uuid import UUID
from datetime import date, datetime

# Add backend to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.main import app
from app.api.dashboard import get_current_user
from app.core.database import get_db
from app.models.models import Transaction, Category, User, Account

@pytest.fixture
def mock_db_session():
    return MagicMock()

def test_dashboard_summary_calculation(mock_db_session):
    # Setup App Overrides
    def override_get_db():
        yield mock_db_session
        
    app.dependency_overrides[get_db] = override_get_db
    
    # We also override current_user to make it simpler to test without hitting DB for it
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))
    
    def override_current_user():
        return mock_user
        
    from app.api.dashboard import get_current_user as dashboard_get_current_user
    app.dependency_overrides[dashboard_get_current_user] = override_current_user
    
    client = TestClient(app)

    # Mock Data
    today = date.today()
    current_year = today.year
    current_month = today.month

    # Mock Transactions for Current Month
    t1 = MagicMock(amount=Decimal('1000.00'), type='INCOME', transaction_date=date(current_year, current_month, 5))
    t2 = MagicMock(amount=Decimal('200.00'), type='EXPENSE', transaction_date=date(current_year, current_month, 10))
    current_month_txns = [t1, t2]

    # Mock Transactions for Last Month
    t3 = MagicMock(amount=Decimal('800.00'), type='INCOME')
    t4 = MagicMock(amount=Decimal('300.00'), type='EXPENSE')
    last_month_txns = [t3, t4]

    # Side effects for DB queries
    q_balance = MagicMock()
    q_balance.filter.return_value.scalar.return_value = Decimal('5000.00')
    
    q_current = MagicMock()
    q_current.join.return_value.filter.return_value.all.return_value = current_month_txns
    
    q_last = MagicMock()
    q_last.join.return_value.filter.return_value.all.return_value = last_month_txns
    
    # We removed user query from the router method, it's now in the dependency
    mock_db_session.query.side_effect = [q_balance, q_current, q_last]
    
    # Execute
    response = client.get("/api/dashboard/summary")
        
    assert response.status_code == 200
    data = response.json()
    
    # Verify Cards
    assert data['cards']['balance'] == 5000.0
    assert data['cards']['income'] == 1000.0 # t1
    assert data['cards']['expenses'] == 200.0 # t2 abs
    
    # Verify Comparisons
    assert data['month_comparison']['current']['income'] == 1000.0
    assert data['month_comparison']['current']['expenses'] == 200.0
    assert data['month_comparison']['last']['income'] == 800.0
    assert data['month_comparison']['last']['expenses'] == 300.0
    
    # Verify Chart Data
    chart = data['chart_data']
    day_5 = next(d for d in chart if d['day'] == 5)
    assert day_5['income'] == 1000.0
    assert day_5['expenses'] == 0
    
    day_10 = next(d for d in chart if d['day'] == 10)
    assert day_10['income'] == 0
    assert day_10['expenses'] == 200.0
    
    # Cleanup overrides
    app.dependency_overrides.clear()
