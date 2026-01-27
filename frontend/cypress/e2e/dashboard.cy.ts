describe("Dashboard", () => {
  beforeEach(() => {
    // Mock the dashboard summary endpoint
    cy.intercept("GET", "**/api/dashboard/summary", {
      statusCode: 200,
      body: {
        current_date: {
          year: 2024,
          month: "January",
          month_int: 1,
        },
        cards: {
          balance: 5000,
          income: 3000,
          expenses: 1200,
        },
        month_comparison: {
          current: { income: 3000, expenses: 1200 },
          last: { income: 2800, expenses: 1100 },
        },
        chart_data: [], // Empty for now or mock if needed
      },
    }).as("getDashboardSummary");

    cy.visit("/");
  });

  it("should display the dashboard with correct data", () => {
    cy.wait("@getDashboardSummary");

    // Check for Month and Year
    cy.contains("January 2024").should("be.visible");

    // Check for Balance Cards
    cy.contains("Total Balance").should("be.visible");
    cy.contains("$5,000").should("be.visible");

    // Check for Income Card
    cy.contains("Income This Month").should("be.visible");
    cy.contains("+$3,000").should("be.visible");

    // Check for Expenses Card
    cy.contains("Expenses This Month").should("be.visible");
    cy.contains("-$1,200").should("be.visible");

    // Check for Charts section
    cy.contains("Income vs Expenses").should("be.visible");

    // Check for Comparison section
    cy.contains("Last Month").should("be.visible");
    // Verify Chart is present (implied by container or specific text if any, but "Last Month" title is there)
    // We can check if the bars exist in DOM if needed, but simplified check:
    cy.get(".recharts-bar-rectangle").should("exist");
  });
});
