describe("Accounts Page", () => {
  const accountsMock = [
    {
      id: "1",
      name: "Bank of America",
      type: "Checking",
      current_balance: 1500.0,
      currency: "USD",
    },
    {
      id: "2",
      name: "Chase",
      type: "Savings",
      current_balance: 5000.0,
      currency: "USD",
    },
  ];

  beforeEach(() => {
    // Stub the backend response for accounts
    cy.intercept("GET", "**/api/accounts", { body: accountsMock }).as(
      "getAccounts",
    );
    cy.visit("/accounts");
  });

  it("should display the accounts page title", () => {
    cy.get("h1").should("contain", "Accounts");
  });

  it("should display the list of accounts", () => {
    cy.wait("@getAccounts");
    cy.get(".grid > div").should("have.length", 2);
    cy.contains("Bank of America").should("be.visible");
    cy.contains("Checking").should("be.visible");
    cy.contains("$1,500.00").should("be.visible");
  });

  it("should create a new account", () => {
    cy.intercept("POST", "**/api/accounts", {
      body: {
        id: "3",
        name: "New Account",
        type: "Cash",
        current_balance: 100,
        currency: "USD",
      },
    }).as("createAccount");

    // Stub refresh
    cy.intercept("GET", "**/api/accounts", {
      body: [
        ...accountsMock,
        {
          id: "3",
          name: "New Account",
          type: "Cash",
          current_balance: 100,
          currency: "USD",
        },
      ],
    }).as("getAccountsRefresh");

    cy.contains("Create Account").click();
    cy.get("input[placeholder='E.g. Main Checking']").type("New Account");
    cy.get("input[placeholder='E.g. Checking, Savings, Credit Card']").type(
      "Cash",
    );
    cy.get("input[type='number']").type("100");

    // Using contains for the Create button inside the modal
    cy.get("#create-account-button").click();

    cy.wait("@createAccount");
    cy.wait("@getAccountsRefresh");

    cy.contains("New Account").should("be.visible");
  });

  it("should edit an account", () => {
    cy.intercept("PUT", "**/api/accounts/*", {
      body: {
        id: "1",
        name: "Bank of America Updated",
        type: "Checking Interest",
        current_balance: 1500.0,
        currency: "USD",
      },
    }).as("updateAccount");

    cy.intercept("GET", "**/api/accounts", {
      body: [
        {
          id: "1",
          name: "Bank of America Updated",
          type: "Checking Interest",
          current_balance: 1500.0,
          currency: "USD",
        },
        accountsMock[1],
      ],
    }).as("getAccountsAfterEdit");

    // Hover over the card to show buttons (if implemented with hover)
    // Or just force click since we used `opacity-0 group-hover:opacity-100` class in Tailwind.
    // In Cypress we can force click hidden elements or trigger hover.

    // Trigger hover
    cy.get(".group").first().trigger("mouseover");
    // Find pencil icon button
    cy.get(".group").first().find("button").first().click({ force: true }); // Pencil is the first button

    cy.get("input").first().clear().type("Bank of America Updated");
    cy.get("input").eq(1).clear().type("Checking Interest");

    cy.contains("Save Changes").click();

    cy.wait("@updateAccount");
    cy.wait("@getAccountsAfterEdit");

    cy.contains("Bank of America Updated").should("be.visible");
  });

  it("should delete an account", () => {
    cy.intercept("DELETE", "**/api/accounts/*", {
      statusCode: 200,
      body: { message: "Account deleted" },
    }).as("deleteAccount");

    cy.intercept("GET", "**/api/accounts", {
      body: [accountsMock[1]], // Only account 2 remains
    }).as("getAccountsAfterDelete");

    // Trigger delete
    cy.get(".group").first().trigger("mouseover");
    // Trash is the second button
    cy.get(".group").first().find("button").eq(1).click({ force: true });

    cy.contains("Warning: Destructive Action").should("be.visible");
    cy.contains("Delete Permanently").click();

    cy.wait("@deleteAccount");
    cy.wait("@getAccountsAfterDelete");

    cy.contains("Bank of America").should("not.exist");
    cy.contains("Chase").should("be.visible");
  });
});
