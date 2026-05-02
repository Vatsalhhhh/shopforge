import { test, expect, request } from "@playwright/test";

const API = "http://localhost:8000/api/v1";
const ts = () => Date.now().toString();

// ── Register page ────────────────────────────────────────────────

test("Register — form renders all required fields", async ({ page }) => {
  await page.goto("/auth/register");
  await expect(page.getByLabel(/first name/i)).toBeVisible();
  await expect(page.getByLabel(/last name/i)).toBeVisible();
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
  await expect(page.getByLabel(/^password$/i)).toBeVisible();
  await expect(page.getByLabel(/confirm password/i)).toBeVisible();
});

test("Register — mismatched passwords shows error", async ({ page }) => {
  await page.goto("/auth/register");
  await page.getByLabel(/first name/i).fill("Test");
  await page.getByLabel(/last name/i).fill("User");
  await page.getByLabel(/email/i).first().fill(`bad_${ts()}@test.io`);
  await page.getByLabel(/^password$/i).fill("Test@1234!");
  await page.getByLabel(/confirm password/i).fill("Different@9999!");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/do not match/i)).toBeVisible();
});

test("Register — valid submission shows success state", async ({ page }) => {
  await page.goto("/auth/register");
  const email = `ui_${ts()}@test.io`;
  await page.getByLabel(/first name/i).fill("Vatsal");
  await page.getByLabel(/last name/i).fill("Test");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/^password$/i).fill("Test@1234!");
  await page.getByLabel(/confirm password/i).fill("Test@1234!");
  await page.getByRole("button", { name: /create account/i }).click();
  // Should show success state (either "check inbox" or "backend logs" message)
  await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 8000 });
});

test("Register — duplicate email shows error toast", async ({ page }) => {
  // Pre-create a user via API
  const ctx = await request.newContext();
  const email = `dup_${ts()}@test.io`;
  await ctx.post(`${API}/auth/register`, {
    data: { first_name: "A", last_name: "B", email, password: "Test@1234!", confirm_password: "Test@1234!" }
  });

  await page.goto("/auth/register");
  await page.getByLabel(/first name/i).fill("A");
  await page.getByLabel(/last name/i).fill("B");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/^password$/i).fill("Test@1234!");
  await page.getByLabel(/confirm password/i).fill("Test@1234!");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 6000 });
});

// ── Login page ────────────────────────────────────────────────────

test("Login — form renders", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
  await expect(page.getByLabel(/password/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("Login — wrong credentials shows error", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel(/email/i).first().fill("nobody@nowhere.io");
  await page.getByLabel(/password/i).first().fill("Wrong@1234!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid|failed/i)).toBeVisible();
});

test("Login — valid credentials redirects away from login page", async ({ page }) => {
  // Create + verify a user via API first
  const ctx = await request.newContext();
  const email = `login_${ts()}@test.io`;
  const pwd = "Test@1234!";
  await ctx.post(`${API}/auth/register`, {
    data: { first_name: "Login", last_name: "Test", email, password: pwd, confirm_password: pwd }
  });
  const tokRes = await ctx.get(`${API}/auth/dev/verification-token`, { params: { email } });
  const token = (await tokRes.json()).token;
  await ctx.get(`${API}/auth/verify-email`, { params: { token } });

  await page.goto("/auth/login");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByLabel(/password/i).first().fill(pwd);
  await page.getByRole("button", { name: /sign in/i }).click();
  // After login, URL should change (redirect to home or dashboard)
  await page.waitForURL((url) => !url.href.includes("/auth/login"), { timeout: 8000 });
});

// ── Forgot password page ──────────────────────────────────────────

test("Forgot password — submit known email shows confirmation", async ({ page }) => {
  const ctx = await request.newContext();
  const email = `fp_${ts()}@test.io`;
  await ctx.post(`${API}/auth/register`, {
    data: { first_name: "Fp", last_name: "Test", email, password: "Test@1234!", confirm_password: "Test@1234!" }
  });

  await page.goto("/auth/forgot-password");
  await page.getByLabel(/email/i).first().fill(email);
  await page.getByRole("button", { name: /send/i }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
});

// ── Reset password page ───────────────────────────────────────────

test("Reset password — page loads with token in URL", async ({ page }) => {
  await page.goto("/auth/reset-password?token=sometoken123");
  await expect(page.getByLabel(/new password/i)).toBeVisible();
  await expect(page.getByLabel(/confirm password/i)).toBeVisible();
});

test("Reset password — invalid token shows error", async ({ page }) => {
  await page.goto("/auth/reset-password?token=invalidtoken");
  await page.getByLabel(/new password/i).fill("NewPass@5678!");
  await page.getByLabel(/confirm password/i).fill("NewPass@5678!");
  await page.getByRole("button", { name: /reset/i }).click();
  await expect(page.getByText(/expired|invalid/i)).toBeVisible({ timeout: 6000 });
});
