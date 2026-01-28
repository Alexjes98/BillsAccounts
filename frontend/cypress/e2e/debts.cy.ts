describe("Debts", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/debts", {
      statusCode: 200,
      fixture: "debts.json",
    }).as("getDebts");

    cy.intercept("GET", "**/persons", {
      statusCode: 200,
      fixture: "persons.json",
    }).as("getPersons");

    cy.intercept("GET", "**/debts/summary", {
      statusCode: 200,
      fixture: "debts_summary.json",
    }).as("getDebtsSummary");

    cy.visit("/");
    cy.contains("Debts").click();
  });

  it("should show the debts", () => {
    cy.wait("@getDebts");

    cy.contains("Test1 → Test2").should("be.visible");
    cy.contains("$100.00").should("be.visible");
    cy.contains("1 debt").should("be.visible");

    cy.contains("Date").should("be.visible");
    cy.contains("Description").should("be.visible");
    cy.contains("Creditor/Debtor").should("be.visible");
    cy.contains("Amount").should("be.visible");
    cy.contains("Remaining").should("be.visible");

    cy.contains("December 31st, 2021").should("be.visible");
    cy.contains("Debt description").should("be.visible");
    cy.contains("Test1 → Test2").should("be.visible");
    cy.contains("$100.00").should("be.visible");
    cy.contains("$100.00").should("be.visible");
  });

  it("should show empty state when there are no debts", () => {
    cy.intercept("GET", "**/debts", {
      statusCode: 200,
      body: [],
    }).as("getDebts");

    cy.intercept("GET", "**/debts/summary", {
      statusCode: 200,
      body: [],
    }).as("getDebtsSummary");

    cy.wait("@getDebts");

    cy.visit("/");
    cy.contains("Debts").click();

    cy.wait("@getDebts");
    cy.wait("@getDebtsSummary");

    cy.contains("No debt summaries available.").should("be.visible");
    cy.contains("No active debts.").should("be.visible");
    cy.contains("No settled debts.").should("be.visible");
  });

  it("should create a new debt", () => {
    cy.intercept("POST", "**/debts", {
      statusCode: 200,
      body: {
        id: "2",
        description: "New debt",
        amount: 200,
        creditor_id: "Test1",
        debtor_id: "Test2",
        is_settled: false,
        created_at: new Date().toISOString(),
      },
    }).as("createDebt");

    cy.contains("Add Debt").click();
    cy.get("input#description").type("New debt");
    cy.get("input#amount").type("200");
    cy.get("select#direction").select("payable");
    cy.get("select#counterparty").select("Test1");
    cy.get("button[type='submit']").click();

    cy.wait("@createDebt");

    cy.contains("Create Debt").should("not.exist");
  });
});
