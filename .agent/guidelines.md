# Project Guidelines

## Frontend Development

### API Calls

- **Location**: All API calls must be defined as functions within `frontend/src/api/api.ts`.
- **Execution**: API calls should primarily be executed within `useEffect` hooks in components to ensure proper lifecycle management.
- **Usage**: Import the API functions into your components rather than making raw `axios` or `fetch` calls directly in the component code.

### Testing (Cypress)

- **Coverage**: Every page in the application must have a corresponding Cypress test file in `frontend/cypress/e2e/`.
- **Fixtures**: Tests must use fixtures for API responses to ensure completely isolated and reliable test runs. Do not rely on the live backend for Cypress tests.
- **Mocking**: Use `cy.intercept` to mock API routes and return the fixture data.

## Backend Development (Python)

## Testing (Pytest)

- **Coverage**: Every endpoint in the application must have a corresponding Pytest test file in `backend/tests/`.
- **Fixtures**: Tests must use fixtures for API responses to ensure completely isolated and reliable test runs. Do not rely on the live backend for Pytest tests.
- **Mocking**: Use `pytest-mock` to mock API routes and return the fixture data.

### Models

- **Consistency**: Python models (Pydantic or ORM) must always be kept up-to-date with the database schema.
- **Responses**: When constructing API responses, always use the defined models to ensure response shapes are consistent and typed correctly. Avoid returning raw dictionaries if a model exists.
