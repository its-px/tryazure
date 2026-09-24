import { test, expect, type Page } from "@playwright/test";
import { mockBackend, TENANT, USER } from "./mockBackend";

// A date 3 days out, as the wizard stores it (YYYY-MM-DD, local time).
function targetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Location → service → professional → date → 10:00 slot, then "Confirm". */
async function walkThroughTime(page: Page) {
  await page.goto(`/?tenant=${TENANT.slug}`);
  await page.getByText("At Our Place").click(); // auto-advances
  await page.getByText("Haircut").click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByText("Step 3 of 5")).toBeVisible();
  await page.getByText("Giannis").click();
  await page.getByRole("button", { name: /^Next/ }).click();
  await expect(page.getByText("Step 4 of 5")).toBeVisible();

  const d = targetDate();
  if (d.getMonth() !== new Date().getMonth()) {
    await page.getByRole("button", { name: "Next", exact: true }).click(); // calendar's next month
  }
  await page
    .locator(".rbc-date-cell:not(.rbc-off-range) button", { hasText: new RegExp(`^0?${d.getDate()}$`) })
    .click();
  await page.getByRole("button", { name: /^10:00/ }).first().click();
  await page.getByRole("button", { name: /^Confirm/ }).first().click();
}

async function walkToSummary(page: Page) {
  await walkThroughTime(page);
  await expect(page.getByRole("heading", { name: "Booking Summary" })).toBeVisible();
}

/** Resolves with the message of the next alert() and accepts it. */
const nextAlert = (page: Page) =>
  new Promise<string>((resolve) => page.once("dialog", (d) => (resolve(d.message()), d.accept())));

test("a signed-in client books an appointment", async ({ page }) => {
  const backend = await mockBackend(page, { loggedIn: true });
  await walkToSummary(page);

  await expect(page.getByText("Professional: Giannis")).toBeVisible();
  await expect(page.getByText("Time: 10:00 - 10:30")).toBeVisible();
  await expect(page.getByText("Total: €15.00")).toBeVisible();

  const alert = nextAlert(page);
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  expect(await alert).toBe("Booking confirmed successfully!");

  expect(backend.bookings).toHaveLength(1);
  expect(backend.bookings[0]).toMatchObject({
    user_id: USER.id,
    tenant_id: TENANT.id,
    date: iso(targetDate()),
    location: "our_place",
    professional_id: "prof1",
    start_time: "10:00:00",
    end_time: "10:30:00",
  });
  expect(backend.unexpected).toEqual([]);
});

test("a taken slot is refused and nothing is booked", async ({ page }) => {
  const backend = await mockBackend(page, { loggedIn: true });
  backend.existingBookings = [{ id: "b-old", start_time: "10:00:00", end_time: "10:30:00" }];
  await walkToSummary(page);

  const alert = nextAlert(page);
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  expect(await alert).toBe("This time slot is already booked. Please select a different time slot.");
  expect(backend.bookings).toHaveLength(0);
});

test("a signed-out visitor must sign in before reaching the summary", async ({ page }) => {
  const backend = await mockBackend(page);
  await walkThroughTime(page);

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Booking Summary" })).toHaveCount(0);
  expect(backend.bookings).toHaveLength(0);
});

test.describe("Greek browser", () => {
  test.use({ locale: "el-GR" });

  test("the wizard is shown in Greek", async ({ page }) => {
    await mockBackend(page);
    await page.goto(`/?tenant=${TENANT.slug}`);
    await expect(page.getByText("Βήμα 1 από 5")).toBeVisible();
    await expect(page.getByText("Στον χώρο μας", { exact: true })).toBeVisible();
  });
});
