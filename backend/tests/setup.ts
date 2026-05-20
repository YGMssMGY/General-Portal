import { beforeAll, afterAll } from "vitest";

const TEST_DEV_URL = process.env["DATABASE_URL_DEVELOPERS"] ?? "";
const TEST_STUCO_URL = process.env["DATABASE_URL_STUCO"] ?? "";

beforeAll(() => {
	if (!process.env["DATABASE_URL_DEVELOPERS"]) {
		process.env["DATABASE_URL_DEVELOPERS"] =
			"postgresql://localhost:5432/general_portal_test_dev";
	}
	if (!process.env["DATABASE_URL_STUCO"]) {
		process.env["DATABASE_URL_STUCO"] = "postgresql://localhost:5432/general_portal_test_stuco";
	}
});

afterAll(() => {
	// Restore original values if needed
	if (TEST_DEV_URL) process.env["DATABASE_URL_DEVELOPERS"] = TEST_DEV_URL;
	if (TEST_STUCO_URL) process.env["DATABASE_URL_STUCO"] = TEST_STUCO_URL;
});
