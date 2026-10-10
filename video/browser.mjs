// Headless Chromium needs software rendering and no /dev/shm in sandboxed or
// headless-server environments; without these flags Page.captureScreenshot fails.
export const LAUNCH_ARGS = [
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
];
