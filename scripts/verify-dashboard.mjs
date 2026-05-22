import { mkdir } from "node:fs/promises";
import { chromium, devices } from "playwright";

const dashboardUrl = process.env.DASHBOARD_URL ?? "http://localhost:3000/";
const username = process.env.DASHBOARD_BASIC_USER ?? "ops";
const password = process.env.DASHBOARD_BASIC_PASSWORD ?? "password";
const screenshotDirectory = ".screenshots";

await mkdir(screenshotDirectory, { recursive: true });

const browser = await chromium.launch();

try {
  await captureDashboard("desktop", {
    viewport: { height: 1000, width: 1440 },
  });
  await captureDashboard("mobile", devices["iPhone 15"]);
} finally {
  await browser.close();
}

async function captureDashboard(name, contextOptions) {
  const context = await browser.newContext({
    ...contextOptions,
    httpCredentials: {
      password,
      username,
    },
  });
  const page = await context.newPage();

  await page.goto(dashboardUrl, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Inbound carrier sales" }).waitFor();
  await page.screenshot({
    fullPage: true,
    path: `${screenshotDirectory}/dashboard-${name}.png`,
  });

  await context.close();
}
