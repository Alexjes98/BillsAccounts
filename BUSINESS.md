## Business Rules

This application is a personal finance application that allows users to track their income and expenses, manage their savings goals, and track their debts. It is intended to be used by individuals to manage their personal finances.

## Usage Flow

The user will pass for a onboarding flow where it will be asked to create at least one person and one category for income and expense. After that, the user will be able to create transactions, savings goals, and debts.

When a transaction with a debt is created, the debt will be updated with the transaction amount.
If the DEBITOR is the user:
If the transaction is an EXPENSE:
The debt remaining_amount will be decreased by the transaction amount.
If the transaction is an INCOME:
ASK the user to create a new debt with the transaction amount.
If the CREDITOR is the user:
If the transaction is an EXPENSE:
ASK the user to create a new debt with the transaction amount.
If the transaction is an INCOME:
The debt remaining_amount will be decreased by the transaction amount.

### Persons

Persons are the entities that are involved in the financial transactions of the application. They can be either income earners or expense spenders. They can also be debtors or creditors.

### Transactions

Transactions are the financial events that occur in the application. They can be either income or expense transactions. They can also be debt transactions.

### Savings Goals

Savings goals are the financial goals that the user is trying to achieve. They can be either short-term or long-term goals.

### Debts

Debts are the financial obligations that the user has to other persons. They can be either short-term or long-term debts.

## Categories

Categories are the entities that are involved in the financial transactions of the application. They can be either income or expense categories.
