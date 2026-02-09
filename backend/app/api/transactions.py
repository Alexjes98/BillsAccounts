from flask import Blueprint, request, jsonify, g
from decimal import Decimal
from app.core.database import SessionLocal
from app.models.models import Transaction, Category, User, Account, Debt, SavingsGoal
from app.schemas.transaction import TransactionOut, PaginationOut, TransactionCreate, CategoryOut, AccountOut, DebtOut, SavingsGoalOut
from app.schemas.transfer import TransferCreate

transactions_bp = Blueprint('transactions', __name__)

@transactions_bp.route('/categories', methods=['GET'])
def get_categories():
    session = SessionLocal()
    try:
        categories = session.query(Category).all()
        return jsonify([CategoryOut.model_validate(c).model_dump(mode='json') for c in categories])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/accounts', methods=['GET'])
def get_accounts():
    session = SessionLocal()
    try:
        accounts = session.query(Account).all()
        return jsonify([AccountOut.model_validate(a).model_dump(mode='json') for a in accounts])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
        
@transactions_bp.route('/savings-goals', methods=['GET'])
def get_savings_goals():
    session = SessionLocal()
    try:
        savings_goals = session.query(SavingsGoal).all()
        return jsonify([SavingsGoalOut.model_validate(g).model_dump(mode='json') for g in savings_goals])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/transfer', methods=['POST'])
def transfer():
    session = SessionLocal()
    try:
        data = request.json
        try:
             transfer_data = TransferCreate(**data)
        except Exception as e:
             return jsonify({"error": f"Validation error: {e}"}), 400

        user = g.user
        if not user:
             return jsonify({"error": "No user found."}), 500

        # Validate accounts belong to user
        from_account = session.query(Account).filter_by(id=transfer_data.from_account_id, user_id=user.id).first()
        to_account = session.query(Account).filter_by(id=transfer_data.to_account_id, user_id=user.id).first()

        if not from_account or not to_account:
            return jsonify({"error": "One or both accounts not found."}), 404
        
        if from_account.id == to_account.id:
            return jsonify({"error": "Cannot transfer to the same account."}), 400

        if from_account.current_balance < Decimal(str(transfer_data.amount)):
             return jsonify({"error": "Insufficient funds in source account."}), 400

        # Validate Category
        category = session.query(Category).filter_by(id=transfer_data.category_id).first()
        if not category:
             return jsonify({"error": "Category not found."}), 400
        
        if category.type != "TRANSFER":
             return jsonify({"error": "Category must be of type TRANSFER."}), 400

        # Create Transactions
        # 1. Outgoing from Source
        tx_out = Transaction(
            user_id=user.id,
            name=f"Transfer to {to_account.name}",
            description=transfer_data.description,
            amount=-abs(Decimal(str(transfer_data.amount))),
            transaction_date=transfer_data.transaction_date,
            category_id=category.id,
            account_id=from_account.id
        )
        
        # 2. Incoming to Destination
        tx_in = Transaction(
            user_id=user.id,
            name=f"Transfer from {from_account.name}",
            description=transfer_data.description,
            amount=abs(Decimal(str(transfer_data.amount))),
            transaction_date=transfer_data.transaction_date,
            category_id=category.id,
            account_id=to_account.id
        )

        session.add(tx_out)
        session.add(tx_in)
        
        # Update Balances
        from_account.current_balance += tx_out.amount
        to_account.current_balance += tx_in.amount

        session.commit()
        
        return jsonify({"message": "Transfer successful"}), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/', methods=['GET', 'POST'], strict_slashes=False)
def transactions():
    session = SessionLocal()
    try:
        if request.method == 'GET':
            # Parameters
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 12, type=int)
            search = request.args.get('search', '', type=str)
            category_id = request.args.get('category_id', type=str)
            account_id = request.args.get('account_id', type=str)
            date_filter = request.args.get('date', type=str)
            txn_type = request.args.get('type', type=str) # EXPENSE / INCOME

            # Base Query
            query = session.query(Transaction)

            # Join for Category Type filtering if needed
            if txn_type:
                 query = query.join(Category).filter(Category.type == txn_type)

            # Apply Filters
            if search:
                search_term = f"%{search}%"
                query = query.filter((Transaction.name.ilike(search_term)) | (Transaction.description.ilike(search_term)))
            
            if category_id:
                query = query.filter(Transaction.category_id == category_id)
            
            if account_id:
                query = query.filter(Transaction.account_id == account_id)

            if request.args.get('debt_id'):
                query = query.filter(Transaction.debt_id == request.args.get('debt_id'))

                
            if date_filter:
                # Assuming date format YYYY-MM-DD
                from sqlalchemy import cast, Date
                query = query.filter(cast(Transaction.transaction_date, Date) == date_filter)

            # Sorting
            query = query.order_by(Transaction.transaction_date.desc())

            # Pagination
            total_items = query.count()
            total_pages = (total_items + per_page - 1) // per_page
            
            transactions_db = query.offset((page - 1) * per_page).limit(per_page).all()
            
            results = [TransactionOut.model_validate(t).model_dump(mode='json') for t in transactions_db]
            
            return PaginationOut(
                items=results,
                total=total_items,
                page=page,
                per_page=per_page,
                pages=total_pages
            ).model_dump(mode='json')
        
        elif request.method == 'POST':
            data = request.json
            # Validate input using Pydantic
            try:
                txn_data = TransactionCreate(**data)
            except Exception as e:
                return jsonify({"error": f"Validation error: {e}"}), 400

            # Get user from AppContext
            if not g.user:
                 return jsonify({"error": "No user found in context."}), 500
            user = g.user
             
            category = session.query(Category).filter_by(id=txn_data.category_id).first()
            if not category:
                return jsonify({"error": "Invalid category type."}), 400
            
            #TODO: MODIFY THIS TO SUPPORT ALL POSIBLE COMBINATIONS
            
            if category.type == "EXPENSE":
                is_expense = True
                txn_data.amount = -abs(txn_data.amount)
            else:
                is_expense = False

            # Handle Debt Update
            if txn_data.debt_id:
                if not txn_data.person_id:
                     return jsonify({"error": "Person ID is required when linking a debt."}), 400

                debt = session.query(Debt).filter_by(id=txn_data.debt_id).first()
                if not debt:
                    return jsonify({"error": "Invalid debt ID."}), 400
                
                # Check if person is part of the debt
                if txn_data.person_id != debt.creditor_id and txn_data.person_id != debt.debtor_id:
                     return jsonify({"error": "The person provided is not part of this debt."}), 400

                # Logic to reduce debt
                should_permit_reduction = False
                
                # Case 1: Expense (User paying)
                if is_expense:
                    # If we are the creditor or debtor making an expense for this debt, we assume it's a payment TOWARDS the debt.
                    # Original logic from prompt: "If the transactions is an expense and the user is the creditor the user is paying the debt"
                    should_permit_reduction = True
                
                # Case 2: Income (User receiving)
                else:
                    # "if the user is the creditor and the transaction is an income it means someone is paying the debt to the user"
                    if txn_data.person_id == debt.creditor_id:
                        should_permit_reduction = True
                    # If debtor receives income, it doesn't necessarily mean the debt is being paid off (could be a loan received), 
                    # so we do nothing unless specified otherwise.
                
                if should_permit_reduction:
                    # Amount is just the magnitude here
                    payment_amount = abs(txn_data.amount)
                    debt.remaining_amount -= Decimal(str(payment_amount))
                    
                    if debt.remaining_amount <= 0:
                        debt.remaining_amount = 0
                        debt.is_settled = True
                    else:
                        debt.is_settled = False
            
            # Create transaction
            new_txn = Transaction(
                user_id=user.id,
                name=txn_data.name,
                description=txn_data.description,
                amount=txn_data.amount,
                transaction_date=txn_data.transaction_date,
                category_id=txn_data.category_id,
                account_id=txn_data.account_id,
                debt_id=txn_data.debt_id,
                savings_goal_id=txn_data.savings_goal_id
            )
            session.add(new_txn)
            
            if new_txn.account_id:
                account = session.query(Account).filter_by(id=new_txn.account_id).first()
                if account:
                    account.current_balance += Decimal(str(new_txn.amount))
            
            session.commit()
            session.refresh(new_txn)
            
            return jsonify(TransactionOut.model_validate(new_txn).model_dump(mode='json')), 201

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/<uuid:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    session = SessionLocal()
    try:
        transaction = session.query(Transaction).filter_by(id=transaction_id).first()
        if not transaction:
             return jsonify({"error": "Transaction not found"}), 404
        
        return jsonify(TransactionOut.model_validate(transaction).model_dump(mode='json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/<uuid:transaction_id>', methods=['PUT', 'PATCH'])
def update_transaction(transaction_id):
    session = SessionLocal()
    try:
        transaction = session.query(Transaction).filter_by(id=transaction_id).first()
        if not transaction:
             return jsonify({"error": "Transaction not found"}), 404
             
        data = request.json
        # We use TransactionCreate for validation, but we handle the update manually
        # to ensure we don't accidentally break relationships or complex logic unless intended.
        # For now, we support updating basic fields.
        
        # If the user sends a full payload, we can use it.
        # Using a partial approach is safer for now if we don't want to re-run complex debt logic
        # strictly unless we are sure. But for "Edit", usually we want to update what's sent.
        
        # --- UPDATE ACCOUNT BALANCE (PART 1: Revert old) ---
        old_account_id = transaction.account_id
        old_amount = transaction.amount
        
        if old_account_id:
             old_account = session.query(Account).filter_by(id=old_account_id).first()
             if old_account:
                 # Subtract the old amount to revert its effect
                 old_account.current_balance -= old_amount

        # --- APPLY UPDATES ---
        if 'name' in data:
            transaction.name = data['name']
        if 'description' in data:
            transaction.description = data['description']
        if 'transaction_date' in data:
            transaction.transaction_date = data['transaction_date']
        
        # Determine Category to check type
        if 'category_id' in data:
            transaction.category_id = data['category_id']
            # Fetch new category to check type
            category = session.query(Category).filter_by(id=transaction.category_id).first()
        else:
            # Use existing category
            category = transaction.category
            
        if not category:
             return jsonify({"error": "Invalid category associated with transaction."}), 400

        # Update Amount with correct sign based on Category Type
        if 'amount' in data:
            raw_amount = Decimal(str(data['amount']))
            if category.type == "EXPENSE":
                transaction.amount = -abs(raw_amount)
            else:
                transaction.amount = abs(raw_amount)
        elif 'category_id' in data:
            # If only category changed, we must re-evaluate sign of existing amount
             if category.type == "EXPENSE":
                transaction.amount = -abs(transaction.amount)
             else:
                transaction.amount = abs(transaction.amount)

        if 'account_id' in data:
            transaction.account_id = data['account_id']
        if 'debt_id' in data:
            transaction.debt_id = data['debt_id']
        if 'savings_goal_id' in data:
            transaction.savings_goal_id = data['savings_goal_id']

        # --- UPDATE ACCOUNT BALANCE (PART 2: Apply new) ---
        if transaction.account_id:
             new_account = session.query(Account).filter_by(id=transaction.account_id).first()
             if new_account:
                 new_account.current_balance += transaction.amount
            
        session.commit()
        session.refresh(transaction)
        
        return jsonify(TransactionOut.model_validate(transaction).model_dump(mode='json'))

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()

@transactions_bp.route('/<uuid:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    session = SessionLocal()
    try:
        transaction = session.query(Transaction).filter_by(id=transaction_id).first()
        if not transaction:
             return jsonify({"error": "Transaction not found"}), 404

        # Requirement: "If a transaction is removed and that transaction affected a debt the debt should be left as it was."
        # We do NOT update the linked debt's remaining_amount.
        
        # We use strict delete (row removal) or soft delete?
        # The model has deleted_at column. Let's use soft delete if possible, or just hard delete if that's the convention.
        # Looking at other code, it seems we might just want to set deleted_at.
        # However, line 166 says `deleted_at = Column(...)`.
        
        from datetime import datetime
        transaction.deleted_at = datetime.now()
        
        # Alternatively, strict delete:
        # session.delete(transaction)
        
        # I will stick to soft delete since the column exists.
        
        # --- UPDATE ACCOUNT BALANCE (Revert effect) ---
        # If it wasn't already deleted, revert the balance change
        if not transaction.deleted_at: 
             if transaction.account_id:
                 account = session.query(Account).filter_by(id=transaction.account_id).first()
                 if account:
                     # Subtract the amount to reverse the transaction effect
                     account.current_balance -= Decimal(str(transaction.amount))

        session.commit()
        
        return jsonify({"message": "Transaction deleted successfully"}), 200

    except Exception as e:
        session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()
