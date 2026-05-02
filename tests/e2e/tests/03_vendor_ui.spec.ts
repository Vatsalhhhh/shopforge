import { test, expect, request } from "@playwright/test";

const API = "http://localhost:8000/api/v1";
const ts = () => Date.now().toString();

// ── Vendor login page ─────────────────────────────────────────────

test("Vendor login — page renders dark theme", async ({ page }) => {
  await page.goto("/vendor-auth/login");
  await expect(page.getByText(/vendor portal/i)).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("Vendor login — wrong credentials shows error", async ({ page }) => {
  await page.goto("/vendor-auth/login");
  await page.getByLabel(/email/i).fill("nobody@nowhere.io");
  await page.getByLabel(/password/i).fill("Wrong@1111!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid|failed/i)).toBeVisible();
});

test("Vendor login — unverified email shows gate message", async ({ page }) => {
  const ctx = await request.newContext();
  const sfx = ts();
  const email = `v_${sfx}@test.io`;
  await ctx.post(`${API}/vendor/register`, {
    data: {
      first_name: "Jane", last_name: "Vendor", email,
      phone: "+12025550199", password: "Vendor@9999!", confirm_password: "Vendor@9999!",
      business_name: `Biz ${sfx}`, business_email: `biz${sfx}@shop.io`,
      business_phone: "+12025550200", business_address: "123 Test St, NY",
    }
  });

  await page.goto("/vendor-auth/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill("Vendor@9999!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/verify/i)).toBeVisible({ timeout: 6000 });
});

// ── Vendor register page ──────────────────────────────────────────

test("Vendor register — form renders all sections", async ({ page }) => {
  await page.goto("/vendor-auth/register");
  await expect(page.getByText(/vendor/i).first()).toBeVisible();
  await expect(page.getByLabel(/first name/i)).toBeVisible();
  await expect(page.getByLabel(/business name/i)).toBeVisible();
  await expect(page.getByLabel(/business email/i)).toBeVisible();
});

test("Vendor register — successful application shows next steps", async ({ page }) => {
  await page.goto("/vendor-auth/register");
  const sfx = ts();

  await page.locator('#first_name').fill("Jane");
  await page.locator('#last_name').fill("Vendor");
  await page.locator('#email').fill(`vui_${sfx}@test.io`);
  await page.locator('#phone').fill("+12025550199");
  await page.locator('#business_name').fill(`Biz ${sfx}`);
  await page.locator('#business_email').fill(`biz${sfx}@shop.io`);
  await page.locator('#business_phone').fill("+12025550200");
  await page.locator('#business_address').fill("123 Commerce St, New York, NY");
  await page.locator('#password').fill("Vendor@9999!");
  await page.locator('#confirm_password').fill("Vendor@9999!");

  await page.getByRole("button", { name: /apply|submit/i }).click();
  await expect(page.getByText("Application received!")).toBeVisible({ timeout: 10000 });
});

// ── Vendor portal protection ──────────────────────────────────────

test("Vendor dashboard — redirects unauthenticated users", async ({ page }) => {
  await page.goto("/vendor/dashboard");
  // Should redirect to login page
  await page.waitForURL((url) => url.href.includes("login"), { timeout: 6000 });
});
