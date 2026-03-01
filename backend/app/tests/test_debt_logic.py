import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
import sys
import os
from fastapi.testclient import TestClient
from uuid import UUID

# Add backend to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.main import app
from app.core.database import get_db
from app.models.models import Debt, Category, User, Account

@pytest.fixture
def mock_db_session():
    return MagicMock()

@pytest.fixture
def test_client(mock_db_session):
    def override_get_db():
        yield mock_db_session
        
    app.dependency_overrides[get_db] = override_get_db
    
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))
    
    from app.api.transactions import get_current_user
    def override_current_user():
        return mock_user
        
    app.dependency_overrides[get_current_user] = override_current_user
    
    client = TestClient(app)
    yield client
    
    app.dependency_overrides.clear()

def test_expense_reduces_debt(test_client, mock_db_session):
    # Setup Data
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debtor_id_str = "12345678-1234-5678-1234-567812345602"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Payment",
        "amount": 50.0,
        "transaction_date": "2023-10-10",
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": creditor_id_str
    }
    
    # Mock Category (Expense)
    mock_category = Category(id=UUID(cat_id_str), type="EXPENSE")
    
    # Debt Object
    mock_debt = Debt(
        id=UUID(debt_id_str),
        creditor_id=UUID(creditor_id_str),
        debtor_id=UUID("12345678-1234-5678-1234-567812345699"),
        remaining_amount=Decimal('100.00'),
        is_settled=False
    )
    
    def query_side_effect(model):
        query_mock = MagicMock()
        if model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
        
    mock_db_session.query.side_effect = query_side_effect
    
    # Simulate DB adding the ID
    def add_side_effect(obj):
        if hasattr(obj, 'id') and obj.id is None:
             obj.id = UUID("12345678-1234-5678-1234-567812349999")
            
    mock_db_session.add.side_effect = add_side_effect
    mock_db_session.refresh = MagicMock() # Just mock it to prevent errors

    # Execute within context
    response = test_client.post("/api/transactions/", json=json_data)
    
    assert response.status_code == 201
    
    # Assert
    assert mock_debt.remaining_amount == Decimal('50.00')
    assert mock_debt.is_settled is False

def test_income_creditor_reduces_debt(test_client, mock_db_session):
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Repayment",
        "amount": 100.0, # Income positive
        "transaction_date": "2023-10-10",
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": creditor_id_str
    }
    
    mock_category = Category(id=UUID(cat_id_str), type="INCOME")
    
    mock_debt = Debt(
        id=UUID(debt_id_str),
        creditor_id=UUID(creditor_id_str), # Matches person_id
        debtor_id=UUID("12345678-1234-5678-1234-567812345699"),
        remaining_amount=Decimal('100.00'),
        is_settled=False
    )
    
    def query_side_effect(model):
        query_mock = MagicMock()
        if model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
    mock_db_session.query.side_effect = query_side_effect
    
    # Simulate DB adding the ID
    def add_side_effect(obj):
        if hasattr(obj, 'id') and obj.id is None:
             obj.id = UUID("12345678-1234-5678-1234-567812349999")
            
    mock_db_session.add.side_effect = add_side_effect
    mock_db_session.refresh = MagicMock() 

    response = test_client.post("/api/transactions/", json=json_data)
    
    assert response.status_code == 201
    
    # Income of 100 should reduce remaining from 100 to 0 and settle
    assert mock_debt.remaining_amount == Decimal('0.00')
    assert mock_debt.is_settled is True

def test_income_debtor_no_change(test_client, mock_db_session):
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debtor_id_str = "12345678-1234-5678-1234-567812345602"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Loan Received",
        "amount": 50.0,
        "transaction_date": "2023-10-10",
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": debtor_id_str
    }
    
    mock_category = Category(id=UUID(cat_id_str), type="INCOME")
    
    mock_debt = Debt(
        id=UUID(debt_id_str),
        creditor_id=UUID(creditor_id_str),
        debtor_id=UUID(debtor_id_str), # Matches person_id
        remaining_amount=Decimal('100.00'),
        is_settled=False
    )
    
    def query_side_effect(model):
        query_mock = MagicMock()
        if model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
    mock_db_session.query.side_effect = query_side_effect
    
    # Simulate DB adding the ID
    def add_side_effect(obj):
        if hasattr(obj, 'id') and obj.id is None:
             obj.id = UUID("12345678-1234-5678-1234-567812349999")
            
    mock_db_session.add.side_effect = add_side_effect
    mock_db_session.refresh = MagicMock() 

    response = test_client.post("/api/transactions/", json=json_data)
    
    assert response.status_code == 201
    
    # Should NOT reduce
    assert mock_debt.remaining_amount == Decimal('100.00')
