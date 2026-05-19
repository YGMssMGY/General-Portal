/**
 * Test database helpers.
 *
 * For now these are no-ops that validate the test connection string is set.
 * Real transient schema/DB creation will be refined later.
 */

const DEFAULT_TEST_URL = "postgresql://localhost:5432/general_portal_test";

function getTestDbUrl(): string {
  return process.env["DATABASE_URL_TEST"] || DEFAULT_TEST_URL;
}

/**
 * Validate that a test database URL is configured.
 * In the future this will create a transient PostgreSQL schema.
 */
export async function setupTestDb(): Promise<void> {
  const url = getTestDbUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL_TEST is not set — cannot initialize test database",
    );
  }
  // Connection string is present; real DB creation will go here.
}

/**
 * Tear down the test database.
 * In the future this will drop the transient schema created by setupTestDb().
 */
export async function teardownTestDb(): Promise<void> {
  // Real DB cleanup will go here.
}
