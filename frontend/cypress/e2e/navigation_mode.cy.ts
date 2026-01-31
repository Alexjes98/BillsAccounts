describe("Navigation Mode", () => {
  it("should use normal routes when not in free mode", () => {
    cy.visit("/");
    cy.get("nav")
      .contains("Transactions")
      .should("have.attr", "href", "/transactions");
    cy.get("nav").contains("Debts").should("have.attr", "href", "/debts");
  });

  it("should use free routes when in free mode", () => {
    cy.visit("/free/dashboard");
    cy.get("nav")
      .contains("Transactions")
      .should("have.attr", "href", "/free/transactions");
    cy.get("nav").contains("Debts").should("have.attr", "href", "/free/debts");
  });
});
