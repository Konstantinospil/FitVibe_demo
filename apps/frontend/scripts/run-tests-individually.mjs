#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TEST_TIMEOUT_MS = 60000; // 1 minute
const FULL_SUITE_TIMEOUT_MS = 180000; // 3 minutes

// Get all test files
const testFiles = [
  "tests/frontend/App.test.tsx",
  "tests/frontend/accessibility/Button.accessibility.test.tsx",
  "tests/frontend/accessibility/DateRangePicker.accessibility.test.tsx",
  "tests/frontend/accessibility/LanguageSwitcher.accessibility.test.tsx",
  "tests/frontend/accessibility/PageIntro.accessibility.test.tsx",
  "tests/frontend/accessibility/ThemeToggle.accessibility.test.tsx",
  "tests/frontend/apiClient.test.ts",
  "tests/frontend/bootstrap/bootstrap.test.ts",
  "tests/frontend/components/AdminRoute.test.tsx",
  "tests/frontend/components/AttemptCounter.test.tsx",
  "tests/frontend/components/AuthPageLayout.test.tsx",
  "tests/frontend/components/ConfirmDialog.test.tsx",
  "tests/frontend/components/DateRangePicker.test.tsx",
  "tests/frontend/components/ErrorBoundary.test.tsx",
  "tests/frontend/components/LanguageSwitcher.test.tsx",
  "tests/frontend/components/LockoutTimer.test.tsx",
  "tests/frontend/components/LoginFormContent.test.tsx",
  "tests/frontend/components/MainLayout.test.tsx",
  "tests/frontend/components/MaintenanceBanner.test.tsx",
  "tests/frontend/components/PageIntro.test.tsx",
  "tests/frontend/components/ProtectedRoute.test.tsx",
  "tests/frontend/components/StatusPill.test.tsx",
  "tests/frontend/components/ThemeToggle.test.tsx",
  "tests/frontend/components/exercises/ExerciseCard.test.tsx",
  "tests/frontend/components/exercises/ExerciseFilters.test.tsx",
  "tests/frontend/components/exercises/ExerciseList.test.tsx",
  "tests/frontend/components/feed/UserCard.test.tsx",
  "tests/frontend/components/gamification/BadgeCard.test.tsx",
  "tests/frontend/contexts/AuthContext.test.tsx",
  "tests/frontend/contexts/ToastContext.test.tsx",
  "tests/frontend/hooks/useDashboardAnalytics.test.tsx",
  "tests/frontend/hooks/useHealthStatus.test.tsx",
  "tests/frontend/hooks/useRequiredFieldValidation.test.tsx",
  "tests/frontend/i18n/config.test.ts",
  "tests/frontend/i18n/coverage.test.ts",
  "tests/frontend/layouts/MainLayout.test.tsx",
  "tests/frontend/pages/Dashboard.test.tsx",
  "tests/frontend/pages/Feed.test.tsx",
  "tests/frontend/pages/ForgotPassword.test.tsx",
  "tests/frontend/pages/Home.test.tsx",
  "tests/frontend/pages/Insights.test.tsx",
  "tests/frontend/pages/Logger.test.tsx",
  "tests/frontend/pages/Login.test.tsx",
  "tests/frontend/pages/NotFound.test.tsx",
  "tests/frontend/pages/Planner.test.tsx",
  "tests/frontend/pages/Privacy.test.tsx",
  "tests/frontend/pages/Profile.test.tsx",
  "tests/frontend/pages/Progress.test.tsx",
  "tests/frontend/pages/Register.test.tsx",
  "tests/frontend/pages/ResetPassword.test.tsx",
  "tests/frontend/pages/Sessions.test.tsx",
  "tests/frontend/pages/Settings.test.tsx",
  "tests/frontend/pages/Terms.test.tsx",
  "tests/frontend/pages/TermsReacceptance.test.tsx",
  "tests/frontend/pages/TwoFactorVerificationLogin.test.tsx",
  "tests/frontend/pages/VerifyEmail.test.tsx",
  "tests/frontend/pages/admin/AdminDashboard.test.tsx",
  "tests/frontend/pages/admin/ContentReports.test.tsx",
  "tests/frontend/pages/admin/SystemControls.test.tsx",
  "tests/frontend/pages/admin/UserManagement.test.tsx",
  "tests/frontend/public/login-shell.test.ts",
  "tests/frontend/routes/AppRouter.test.tsx",
  "tests/frontend/routes/ProtectedRoutes.test.tsx",
  "tests/frontend/routes/PublicRoutes.test.tsx",
  "tests/frontend/services/adminApi.test.ts",
  "tests/frontend/services/api.functions.test.ts",
  "tests/frontend/services/api.test.ts",
  "tests/frontend/ssr/cache.test.ts",
  "tests/frontend/store/auth.store.test.tsx",
  "tests/frontend/store/theme.store.test.tsx",
  "tests/frontend/styles/tokens.test.tsx",
  "tests/frontend/ui/Alert.test.tsx",
  "tests/frontend/ui/Avatar.test.tsx",
  "tests/frontend/ui/Button.test.tsx",
  "tests/frontend/ui/Card.test.tsx",
  "tests/frontend/ui/Chart.test.tsx",
  "tests/frontend/ui/Input.test.tsx",
  "tests/frontend/ui/MainLayout.accessibility.test.tsx",
  "tests/frontend/ui/Select.test.tsx",
  "tests/frontend/ui/Skeleton.test.tsx",
  "tests/frontend/ui/VisibilityBadge.test.tsx",
  "tests/frontend/utils/featureFlags.test.tsx",
  "tests/frontend/utils/idempotency.test.ts",
  "tests/frontend/utils/idleScheduler.test.ts",
  "tests/frontend/utils/jwt.test.ts",
  "tests/frontend/utils/logger.test.ts",
  "tests/frontend/utils/suppressConsole.test.ts",
];

const failures = [];

function runTest(testFile, timeout) {
  return new Promise((resolve) => {
    console.log(`\n[RUNNING] ${testFile}`);
    const startTime = Date.now();

    const child = spawn("npm", ["test", "--", testFile], {
      cwd: resolve(process.cwd()),
      stdio: "inherit",
      shell: true,
      env: { ...process.env, VITEST: "true" },
    });

    let timeoutId;
    if (timeout) {
      timeoutId = setTimeout(() => {
        console.log(`\n[TIMEOUT] ${testFile} exceeded ${timeout}ms`);
        child.kill("SIGTERM");
        resolve({ success: false, timeout: true, duration: Date.now() - startTime });
      }, timeout);
    }

    child.on("exit", (code) => {
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const success = code === 0;

      if (success) {
        console.log(`\n[PASSED] ${testFile} (${duration}ms)`);
      } else {
        console.log(`\n[FAILED] ${testFile} (${duration}ms)`);
      }

      resolve({ success, timeout: false, duration });
    });

    child.on("error", (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log(`\n[ERROR] ${testFile}: ${error.message} (${duration}ms)`);
      resolve({ success: false, timeout: false, duration, error: error.message });
    });
  });
}

async function runAllTestsIndividually() {
  console.log("=".repeat(80));
  console.log("Running frontend tests individually");
  console.log("=".repeat(80));

  for (const testFile of testFiles) {
    const result = await runTest(testFile, TEST_TIMEOUT_MS);

    if (!result.success || result.timeout) {
      failures.push({
        file: testFile,
        timeout: result.timeout,
        duration: result.duration,
        error: result.error,
      });

      if (result.timeout) {
        console.log(`\n⚠️  Test exceeded 1 minute timeout. Stopping execution.`);
        console.log(`Please fix the timeout issue in ${testFile} before continuing.`);
        break;
      }
    }
  }

  return failures.length === 0;
}

async function runFullSuite() {
  console.log("\n" + "=".repeat(80));
  console.log("Running full test suite");
  console.log("=".repeat(80));

  const result = await runTest("tests/frontend", FULL_SUITE_TIMEOUT_MS);

  if (!result.success || result.timeout) {
    if (result.timeout) {
      console.log(`\n⚠️  Full test suite exceeded 3 minute timeout.`);
      console.log(`This is likely due to mock pollution.`);
      console.log(`Please review and fix mock isolation issues.`);
      return false;
    }
    return false;
  }

  return true;
}

async function main() {
  const mode = process.argv[2] || "individual";

  if (mode === "individual") {
    const allPassed = await runAllTestsIndividually();

    console.log("\n" + "=".repeat(80));
    console.log("Summary");
    console.log("=".repeat(80));

    if (failures.length > 0) {
      console.log(`\n❌ ${failures.length} test file(s) failed:\n`);
      failures.forEach((f) => {
        if (f.timeout) {
          console.log(`  - ${f.file} (TIMEOUT after ${f.duration}ms)`);
        } else {
          console.log(`  - ${f.file} (${f.duration}ms)`);
        }
      });
      process.exit(1);
    } else {
      console.log("\n✅ All individual tests passed!");
      console.log("\nYou can now run the full test suite with:");
      console.log("  node scripts/run-tests-individually.mjs full");
    }
  } else if (mode === "full") {
    const success = await runFullSuite();
    process.exit(success ? 0 : 1);
  } else {
    console.error("Usage: node run-tests-individually.mjs [individual|full]");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
