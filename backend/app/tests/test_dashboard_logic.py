import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
import sys
import os
from flask import Flask
from uuid import UUID
from datetime import date, datetime

# Add backend to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.api.dashboard import get_dashboard_summary
from app.models.models import Transaction, Category, User, Account

@pytest.fixture
def mock_app():
    return Flask(__name__)

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def mock_session_local(mock_db_session):
    with patch('app.api.dashboard.SessionLocal') as mock:
        mock.return_value = mock_db_session
        yield mock

def test_dashboard_summary_calculation(mock_app, mock_session_local, mock_db_session):
    # Mock User
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))

    # Mock Data
    today = date.today()
    current_year = today.year
    current_month = today.month

    # Mock Transactions for Current Month
    # We need to return objects with .amount, .type, .transaction_date
    t1 = MagicMock(amount=Decimal('1000.00'), type='INCOME', transaction_date=date(current_year, current_month, 5))
    t2 = MagicMock(amount=Decimal('200.00'), type='EXPENSE', transaction_date=date(current_year, current_month, 10))
    current_month_txns = [t1, t2]

    # Mock Transactions for Last Month
    t3 = MagicMock(amount=Decimal('800.00'), type='INCOME')
    t4 = MagicMock(amount=Decimal('300.00'), type='EXPENSE')
    last_month_txns = [t3, t4]

    # Mock Query Chains
    def query_side_effect(*args):
        query_mock = MagicMock()
        
        # User query
        if args[0] == User:
            query_mock.first.return_value = mock_user
            return query_mock
            
        # Balance query (func.sum)
        # It's hard to match func.sum(Account.current_balance) exactly by equality
        # We can check if Account is involved?
        # get_dashboard_summary calls:
        # 1. query(User)
        # 2. query(func.sum(Account.current_balance))
        # 3. query(Transaction.amount, Category.type, ...).join(Category).filter(...).all()
        # 4. query(Transaction.amount, Category.type).join(Category).filter(...).all()
        
        # We can try to distinguish by call order or by args.
        # But side_effect is called with the args passed to .query()
        
        return query_mock

    # It's easier to mock the return values of the chained calls if we can distinguish them.
    # But checking args[0] is strictly necessary.
    
    # 1. User
    mock_db_session.query.return_value.first.return_value = mock_user
    
    # This is too generic because all queries return the same mock object "query_mock" (from default MagicMock behaviour if not overridden)
    # We need specific return values.
    
    # Improved Mocking Strategy:
    # We can inspect the calls to configure them?
    # Or just use side_effect on query()
    
    mock_query = mock_db_session.query 
    
    def side_effect(*args):
        m = MagicMock()
        if args and args[0] == User:
            m.first.return_value = mock_user
        
        # Balance
        elif len(args) == 1 and str(args[0]).startswith('sum('): # Approximate check for func.sum
             m.filter.return_value.scalar.return_value = Decimal('5000.00')

        # Transactions
        # The code uses query(Transaction.amount, Category.type, ...)
        elif len(args) >= 2 and args[0] == Transaction.amount:
             # This matches both current and last month queries
             # We need to distinguish them by filter().
             # current month has filter(..., month == current)
             # last month has filter(..., month == last)
             
             # This is getting complicated to mock perfectly with just side_effect on query.
             # We can mock the chained calls.
             
             # Current month: joined with Category
             # .join(Category).filter(...).all()
             
             # We can't easily distinguish inside the side_effect of query() what the SUBSEQUENT filter call will be.
             # One way is to return different mocks for different query args, and construct those mocks to expect specific filters.
             
             join_mock = MagicMock()
             m.join.return_value = join_mock
             
             # How to distinguish? logic relies on verifying the OUTPUTS based on INPUTS.
             # If we just return the same list for both, the test is weak?
             # Or we can return a list that contains both, but filter() filters them?
             # No, filter() is SQL level.
             
             # Let's simplify. We can assume the first call to this signature is current month, second is last month.
             pass

        return m

    # Since side_effect is hard for chained calls, let's use `pytest-mock` or just `unittest.mock` context managers if possible?
    # Or just rely on call count if we know the order.
    
    # Order in code:
    # 1. query(User)
    # 2. query(func.sum)
    # 3. query(Transaction...).join... (Current)
    # 4. query(Transaction...).join... (Last)
    
    # Let's setup side_effect to return a SEQUENCE of mocks.
    
    q_user = MagicMock()
    q_user.first.return_value = mock_user
    
    q_balance = MagicMock()
    q_balance.filter.return_value.scalar.return_value = Decimal('5000.00')
    
    q_current = MagicMock()
    q_current.join.return_value.filter.return_value.all.return_value = current_month_txns
    
    q_last = MagicMock()
    q_last.join.return_value.filter.return_value.all.return_value = last_month_txns
    
    mock_db_session.query.side_effect = [q_user, q_balance, q_current, q_last]
    
    # Execute
    with mock_app.test_request_context():
        response = get_dashboard_summary()
        
    assert response.status_code == 200
    data = response.json
    
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
    # t1 is on day 5 (income 1000)
    # t2 is on day 10 (expense 200)
    chart = data['chart_data']
    # Chart has entry for every day? Yes.
    # Find day 5
    day_5 = next(d for d in chart if d['day'] == 5)
    assert day_5['income'] == 1000.0
    assert day_5['expenses'] == 0
    
    day_10 = next(d for d in chart if d['day'] == 10)
    assert day_10['income'] == 0
    assert day_10['expenses'] == 200.0

