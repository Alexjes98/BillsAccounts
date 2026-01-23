describe("Transactions Page", () => {
  beforeEach(() => {
    // Intercept the API call and return mock data
    cy.intercept("GET", "**/transactions", {
      statusCode: 200,
      fixture: "transactions.json",
    }).as("getTransactions");

    // Visit the transactions page
    cy.visit("/");
    cy.contains("Transactions").click();
  });

  it("should display the transaction list properly", () => {
    // Wait for the API call
    cy.wait("@getTransactions");

    // Verify the page title
    cy.contains("h1", "Transactions").should("be.visible");

    // Verify table headers
    cy.contains("th", "Date").should("be.visible");
    cy.contains("th", "Name").should("be.visible");
    cy.contains("th", "Category").should("be.visible");
    cy.contains("th", "Account").should("be.visible");
    cy.contains("th", "Amount").should("be.visible");

    // Verify transaction data
    cy.contains("Grocery Store").should("be.visible");
    cy.contains("Food").should("be.visible");
    cy.contains("Checking").should("be.visible");
    cy.contains("-$50.25").should("be.visible");

    cy.contains("Salary").should("be.visible");
    cy.contains("Income").should("be.visible");
    cy.contains("Savings").should("be.visible");
    cy.contains("+$2500.00").should("be.visible");
  });

  it("should handle API errors gracefully", () => {
    // Mock an error response
    cy.intercept("GET", "**/transactions", {
      statusCode: 500,
      body: { error: "Internal Server Error" },
    }).as("getTransactionsError");

    // Reload to trigger the error
    cy.visit("/");
    cy.contains("Transactions").click();
    cy.wait("@getTransactionsError");

    // Verify error message
    cy.contains("Failed to load transactions.").should("be.visible");
  });

  it("should handle empty response gracefully", () => {
    // Mock an empty response
    cy.intercept("GET", "**/transactions", {
      statusCode: 200,
      body: [],
    }).as("getTransactionsEmpty");

    // Reload to trigger the empty response
    cy.visit("/");
    cy.contains("Transactions").click();
    cy.wait("@getTransactionsEmpty");

    // Verify empty state
    cy.contains("No transactions found.").should("be.visible");
  });

  it("should navigate from Dashboard", () => {
    cy.visit("/");
    cy.contains("a", "Transactions").click();
    cy.url().should("include", "/transactions");
    cy.contains("h1", "Transactions").should("be.visible");
  });
});

describe("Transactions Flow", () => {
  beforeEach(() => {
    // Mock API responses here
    cy.intercept("GET", "/api/transactions", {
      fixture: "transactions.json",
    }).as("getTransactions");
    cy.intercept("GET", "/api/categories", {
      fixture: "categories.json",
    }).as("getCategories");
    cy.intercept("GET", "/api/transactions/accounts", {
      fixture: "accounts.json",
    }).as("getAccounts");
    cy.intercept("GET", "/api/debts", {
      fixture: "debts.json",
    }).as("getDebts");
    cy.intercept("GET", "/api/transactions/savings-goals", {
      fixture: "saving_goals.json",
    }).as("getSavingsGoals");
    cy.visit("/");
    cy.contains("Transactions").click();
  });

  it("should open the create transaction modal", () => {
    // Navigate to transactions page if needed, or if it is the home page

    cy.contains("Add Transaction").should("be.visible").click();
    cy.contains("Create Transaction").should("be.visible");

    // Verify form elements exist
    cy.get("input#name").should("exist");
    cy.get("input#amount").should("exist");
    cy.get("select#category").should("exist");
  });

  it("should create a new transaction", () => {
    // Mock POST response
    cy.intercept("POST", "/api/transactions", {
      statusCode: 201,
      body: {
        id: "new-id",
        name: "New Transaction",
        amount: 100.0,
        transaction_date: new Date().toISOString(),
        category: { name: "Test Category" },
        account: { name: "Test Account" },
      },
    }).as("createTransaction");

    cy.contains("Add Transaction").click();

    // Fill form
    cy.get("input#name").type("New Transaction");
    cy.get("input#amount").type("100");
    // Select category (assuming mock data populated it)
    // cy.get('select#category').select('Test Category');

    cy.contains("button", "Create Transaction").click();

    // callback
    cy.wait("@createTransaction");
    cy.contains("Create Transaction").should("not.exist"); // Modal closed
  });
});
