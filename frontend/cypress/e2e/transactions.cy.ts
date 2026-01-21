describe("Transactions Page", () => {
  const transactionsMock = [
    {
      id: "1",
      transaction_date: "2023-10-27T10:00:00",
      name: "Grocery Store",
      amount: -50.25,
      category: { name: "Food", icon: "🍎" },
      account: { name: "Checking" },
    },
    {
      id: "2",
      transaction_date: "2023-10-28T14:00:00",
      name: "Salary",
      amount: 2500.0,
      category: { name: "Income", icon: "💰" },
      account: { name: "Savings" },
    },
  ];

  beforeEach(() => {
    // Intercept the API call and return mock data
    cy.intercept("GET", "**/transactions", {
      statusCode: 200,
      body: transactionsMock,
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
