const EMAIL_SELECTOR = 'input[name="email"]';
const PASSWORD_SELECTOR = 'input[name="password"]';
const SUBMIT_SELECTOR = 'button[type="submit"]';

function getCredentials() {
  const email = process.env.LHCI_EMAIL || process.env.LHCI_USERNAME;
  const password = process.env.LHCI_PASSWORD;
  return email && password ? { email, password } : null;
}

module.exports = async (browser, context) => {
  const { url } = context;
  const page = await browser.newPage();

  const credentials = getCredentials();
  if (!credentials) {
    // No credentials: open URL without login (CI without secrets; auth routes show login page)
    await page.goto(url, { waitUntil: "networkidle0" });
    return page;
  }

  const { email, password } = credentials;
  const loginUrl = new URL("/login", url).toString();

  await page.goto(loginUrl, { waitUntil: "networkidle0" });
  await page.waitForSelector(EMAIL_SELECTOR, { timeout: 10000 });
  await page.type(EMAIL_SELECTOR, email, { delay: 20 });
  await page.type(PASSWORD_SELECTOR, password, { delay: 20 });

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click(SUBMIT_SELECTOR),
  ]);

  const postLoginUrl = page.url();
  if (postLoginUrl.includes("/login")) {
    throw new Error(
      `Login failed or requires 2FA; landed on ${postLoginUrl}. Ensure LHCI user has 2FA disabled.`,
    );
  }

  await page.goto(url, { waitUntil: "networkidle0" });
  return page;
};
