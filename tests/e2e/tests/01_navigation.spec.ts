import { test, expect } from "@playwright/test";

const pages = [
  { url: "/",                    title: /ShopForge/,         desc: "Homepage" },
  { url: "/auth/login",          title: /ShopForge/,         desc: "Customer login" },
  { url: "/auth/register",       title: /ShopForge/,         desc: "Customer register" },
  { url: "/auth/forgot-password",title: /ShopForge/,         desc: "Forgot password" },
  { url: "/auth/verify-email",   title: /ShopForge/,         desc: "Verify email (no token)" },
  { url: "/vendor-auth/login",   title: /ShopForge/,         desc: "Vendor login" },
  { url: "/vendor-auth/register",title: /ShopForge/,         desc: "Vendor register" },
];

for (const { url, title, desc } of pages) {
  test(`${desc} — page loads without crash`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(url);
    await expect(page).toHaveTitle(title);
    expect(errors, `JS errors on ${url}: ${errors.join(", ")}`).toHaveLength(0);
  });
}

test("404 page renders for unknown route", async ({ page }) => {
  await page.goto("/this-route-does-not-exist-xyz");
  const body = await page.textContent("body");
  expect(body).toBeTruthy();
  // Page shouldn't crash — any rendered content is fine
});

test("Homepage shows ShopForge brand name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ShopForge").first()).toBeVisible();
});

test("Homepage has navigation links", async ({ page }) => {
  await page.goto("/");
  // At minimum the page should be interactive
  const links = await page.locator("a").count();
  expect(links).toBeGreaterThan(0);
});
