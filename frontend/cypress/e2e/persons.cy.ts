describe("Persons Page", () => {
  beforeEach(() => {
    // Intercept the API call and return mock data
    cy.intercept("GET", "**/persons", {
      statusCode: 200,
      fixture: "persons.json",
    }).as("getPersons");

    cy.intercept("POST", "**/persons", {
      statusCode: 201,
      fixture: "persons.json",
    }).as("createPerson");

    // Visit the transactions page
    cy.visit("/");
    cy.contains("Persons").click();
  });

  it("should display the persons page", () => {
    cy.wait("@getPersons");
    cy.contains("Persons").should("be.visible");
    cy.contains("Test").should("be.visible");
    cy.contains("Added on 1/22/2026").should("be.visible");
    cy.contains("test@example.com").should("be.visible");
  });

  it("should display an empty state when no persons are found", () => {
    cy.intercept("GET", "**/persons", {
      statusCode: 200,
      body: [],
    }).as("getPersonsEmpty");
    cy.visit("/");
    cy.contains("Persons").click();
    cy.wait("@getPersonsEmpty");
    cy.contains("No persons found.").should("be.visible");
  });

  it("should create a new person", () => {
    cy.contains("New Person").click();
    cy.get("input#name").type("New Person");
    cy.get("input#contactInfo").type("new_person@example.com");
    cy.contains("button", "Add").click();
    cy.wait("@createPerson");
    cy.contains("Add Person").should("not.exist");
  });
});
