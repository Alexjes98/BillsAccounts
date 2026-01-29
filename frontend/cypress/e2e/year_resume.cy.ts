describe("Year Resume Page", () => {
  beforeEach(() => {
    // Ideally seed data or intercept API here
    cy.intercept("GET", "/api/monthly-summaries*", {
      fixture: "monthly_summaries.json",
    }).as("getSummaries");
    cy.visit("/year-resume");
  });
  it("should display the year resume page elements", () => {
    cy.contains("Year Resume").should("be.visible");
    cy.contains("Total Income").should("be.visible");
    cy.contains("Total Expenses").should("be.visible");
    cy.contains("Yearly Net Balance").should("be.visible");
    cy.get("button")
      .contains(/Select Year|20[0-9]{2}/)
      .should("exist"); // Select trigger
  });
  it("should allow recalculating balance", () => {
    cy.intercept("POST", "/api/monthly-summaries/recalculate", {
      message: "Recalculation complete",
      count: 12,
    }).as("recalculate");
    cy.get("button").find(".lucide-refresh-cw").click({ force: true });
    // Note: The button might be disabled while loading, checking behavior
    // Since we just clicked, let's verify the request happens
    cy.wait("@recalculate").its("response.statusCode").should("eq", 200);
  });
});
