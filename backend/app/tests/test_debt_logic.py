import pytest
from unittest.mock import MagicMock, patch
from decimal import Decimal
import sys
import os
from flask import Flask
from uuid import UUID

# Add backend to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.api.transactions import transactions
from app.models.models import Debt, Category, User

@pytest.fixture
def mock_app():
    return Flask(__name__)

@pytest.fixture
def mock_db_session():
    session = MagicMock()
    return session

@pytest.fixture
def mock_session_local(mock_db_session):
    with patch('app.api.transactions.SessionLocal') as mock:
        mock.return_value = mock_db_session
        yield mock

def test_expense_reduces_debt(mock_app, mock_session_local, mock_db_session):
    # Setup Data
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debtor_id_str = "12345678-1234-5678-1234-567812345602"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Payment",
        "amount": 50.0,
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": creditor_id_str
    }
    
    # Mock Default User
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))
    
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
        if model == User:
            query_mock.first.return_value = mock_user
        elif model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
        
    mock_db_session.query.side_effect = query_side_effect
    
    # Execute within context
    with mock_app.test_request_context(json=json_data, method='POST'):
        transactions()
    
    # Assert
    assert mock_debt.remaining_amount == Decimal('50.00')
    assert mock_debt.is_settled is False

def test_income_creditor_reduces_debt(mock_app, mock_session_local, mock_db_session):
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Repayment",
        "amount": 100.0, # Income positive
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": creditor_id_str
    }
    
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))
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
        if model == User:
            query_mock.first.return_value = mock_user
        elif model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
    mock_db_session.query.side_effect = query_side_effect
    
    with mock_app.test_request_context(json=json_data, method='POST'):
        transactions()
    
    # Income of 100 should reduce remaining from 100 to 0 and settle
    assert mock_debt.remaining_amount == Decimal('0.00')
    assert mock_debt.is_settled is True

def test_income_debtor_no_change(mock_app, mock_session_local, mock_db_session):
    creditor_id_str = "12345678-1234-5678-1234-567812345601"
    debtor_id_str = "12345678-1234-5678-1234-567812345602"
    debt_id_str = "12345678-1234-5678-1234-567812345603"
    cat_id_str = "12345678-1234-5678-1234-567812345604"
    
    json_data = {
        "name": "Loan Received",
        "amount": 50.0,
        "category_id": cat_id_str,
        "debt_id": debt_id_str,
        "person_id": debtor_id_str
    }
    
    mock_user = User(id=UUID("12345678-1234-5678-1234-567812345600"))
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
        if model == User:
            query_mock.first.return_value = mock_user
        elif model == Category:
            query_mock.filter_by.return_value.first.return_value = mock_category
        elif model == Debt:
            query_mock.filter_by.return_value.first.return_value = mock_debt
        return query_mock
    mock_db_session.query.side_effect = query_side_effect
    
    with mock_app.test_request_context(json=json_data, method='POST'):
        transactions()
    
    # Should NOT reduce
    assert mock_debt.remaining_amount == Decimal('100.00')
