from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean, Date, Integer, Text, Numeric, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func, text
from app.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    base_currency = Column(String(3), default='USD', nullable=False)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    categories = relationship("Category", back_populates="user")
    savings_goals = relationship("SavingsGoal", back_populates="user")
    persons = relationship("Person", foreign_keys="[Person.user_id]", back_populates="user")
    budgets = relationship("Budget", back_populates="user")
    accounts = relationship("Account", back_populates="user")
    debts = relationship("Debt", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    monthly_summaries = relationship("MonthlySummary", back_populates="user")
    # Relationship to the 'Self' person
    person = relationship("Person", foreign_keys=[person_id])

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    icon = Column(String)
    color = Column(String)
    type = Column(String) # INCOME, EXPENSE, or TRANSFER
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="categories")
    budgets = relationship("Budget", back_populates="category")
    transactions = relationship("Transaction", back_populates="category")

    __table_args__ = (
        UniqueConstraint('user_id', 'name', 'type', name='uq_categories_user_name_type'),
    )


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0)
    deadline = Column(Date)
    status = Column(String, default='ACTIVE')
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="savings_goals")
    transactions = relationship("Transaction", back_populates="savings_goal")


class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    contact_info = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys="[Person.user_id]", back_populates="persons")
    debts_as_creditor = relationship("Debt", foreign_keys="[Debt.creditor_id]", back_populates="creditor")
    debts_as_debtor = relationship("Debt", foreign_keys="[Debt.debtor_id]", back_populates="debtor")

    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_persons_user_name'),
    )


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    amount_limit = Column(Numeric(15, 2), nullable=False)
    period_month = Column(Integer, nullable=False)
    period_year = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint('user_id', 'category_id', 'period_year', 'period_month', name='uq_budgets_user_cat_period'),
    )


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    classification = Column(String, nullable=False) # asset, liability, equity
    type = Column(String, nullable=False) # cash, bank, receivable, payable, credit_card
    current_balance = Column(Numeric(15, 2), default=0)
    currency = Column(String(3), default='USD')
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")


class Debt(Base):
    __tablename__ = "debts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    creditor_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"))
    debtor_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"))
    
    total_amount = Column(Numeric(15, 2), nullable=False)
    remaining_amount = Column(Numeric(15, 2), nullable=False)
    
    description = Column(Text)
    due_date = Column(Date)
    is_settled = Column(Boolean, default=False)
    
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="debts")
    creditor = relationship("Person", foreign_keys=[creditor_id], back_populates="debts_as_creditor")
    debtor = relationship("Person", foreign_keys=[debtor_id], back_populates="debts_as_debtor")
    transactions = relationship("Transaction", back_populates="debt")

    __table_args__ = (
        Index('idx_debts_status', 'user_id', 'is_settled'),
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=True)
    debt_id = Column(UUID(as_uuid=True), ForeignKey("debts.id"), nullable=True)
    savings_goal_id = Column(UUID(as_uuid=True), ForeignKey("savings_goals.id"), nullable=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    
    original_currency = Column(String(3))
    original_amount = Column(Numeric(15, 2))
    exchange_rate_used = Column(Numeric(10, 6))
    
    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    name = Column(Text, nullable=False)
    description = Column(Text)
    
    deleted_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    debt = relationship("Debt", back_populates="transactions")
    savings_goal = relationship("SavingsGoal", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

    __table_args__ = (
        Index('idx_transactions_user_date', 'user_id', 'transaction_date'),
        Index('idx_transactions_account', 'account_id'),
        Index('idx_transactions_debt', 'debt_id'),
    )


class MonthlySummary(Base):
    __tablename__ = "monthly_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("uuid_generate_v4()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    year = Column(Integer)
    month = Column(Integer)
    total_income = Column(Numeric(15, 2))
    total_expense = Column(Numeric(15, 2))
    closing_balance = Column(Numeric(15, 2))
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="monthly_summaries")

    __table_args__ = (
        UniqueConstraint('user_id', 'year', 'month', name='uq_monthly_summaries_user_year_month'),
    )
