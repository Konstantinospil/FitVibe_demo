#!/bin/bash

cd "$(dirname "$0")/../../apps/frontend" || exit 1

REPORT_FILE="../../tests/frontend/TEST_FAILURES_REPORT.md"
TEST_DIR="../../tests/frontend"

echo "# Frontend Test Failures Report" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

PASSED=0
FAILED=0
ERRORS=0
FAILED_FILES=()
PASSED_FILES=()

# Find all test files
TEST_FILES=$(find "$TEST_DIR" -name "*.test.tsx" -o -name "*.test.ts" | sort)

TOTAL=$(echo "$TEST_FILES" | wc -l | tr -d ' ')
CURRENT=0

echo "Running $TOTAL test files..."
echo ""

for test_file in $TEST_FILES; do
  CURRENT=$((CURRENT + 1))
  relative_path=${test_file#$TEST_DIR/}
  display_name=$(printf "%-60s" "$relative_path")
  
  printf "[%3d/%3d] %s ... " "$CURRENT" "$TOTAL" "$display_name"
  
  # Run test and capture output
  output=$(pnpm test "$test_file" 2>&1)
  exit_code=$?
  
  # Check results
  if echo "$output" | grep -qE "(FAIL|failed)" && [ $exit_code -ne 0 ]; then
    FAILED=$((FAILED + 1))
    FAILED_FILES+=("$relative_path")
    
    # Extract failure details
    failed_count=$(echo "$output" | grep -oE "[0-9]+\s+failed" | head -1 | grep -oE "[0-9]+" || echo "?")
    passed_count=$(echo "$output" | grep -oE "[0-9]+\s+passed" | head -1 | grep -oE "[0-9]+" || echo "0")
    
    echo "❌ FAILED ($failed_count failed, $passed_count passed)"
    
    # Add to report
    echo "### $relative_path" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "- **Failed**: $failed_count tests" >> "$REPORT_FILE"
    echo "- **Passed**: $passed_count tests" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Extract failed test names
    failed_tests=$(echo "$output" | grep -E "(FAIL|✖|❌)" | head -10 | sed 's/^[[:space:]]*//')
    if [ -n "$failed_tests" ]; then
      echo "**Failed Tests:**" >> "$REPORT_FILE"
      echo "$failed_tests" | while IFS= read -r line; do
        echo "- $line" >> "$REPORT_FILE"
      done
      echo "" >> "$REPORT_FILE"
    fi
    
    echo "<details>" >> "$REPORT_FILE"
    echo "<summary>View Output</summary>" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "$output" | tail -100 >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "</details>" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
  elif [ $exit_code -eq 0 ] || echo "$output" | grep -qE "passed"; then
    PASSED=$((PASSED + 1))
    passed_count=$(echo "$output" | grep -oE "[0-9]+\s+passed" | head -1 | grep -oE "[0-9]+" || echo "?")
    PASSED_FILES+=("$relative_path ($passed_count tests)")
    echo "✅ PASSED ($passed_count tests)"
  else
    ERRORS=$((ERRORS + 1))
    echo "⚠️  ERROR (exit code: $exit_code)"
    
    echo "### $relative_path (ERROR)" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "- **Exit Code**: $exit_code" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "<details>" >> "$REPORT_FILE"
    echo "<summary>View Error</summary>" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "$output" | tail -50 >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "</details>" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
  fi
done

# Write summary
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- ✅ Passed: $PASSED files" >> "$REPORT_FILE"
echo "- ❌ Failed: $FAILED files" >> "$REPORT_FILE"
echo "- ⚠️  Errors: $ERRORS files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo "## Failed Files" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  for file in "${FAILED_FILES[@]}"; do
    echo "- $file" >> "$REPORT_FILE"
  done
  echo "" >> "$REPORT_FILE"
fi

# Print final summary
echo ""
echo "================================================================================"
echo "FINAL SUMMARY"
echo "================================================================================"
echo "✅ Passed: $PASSED files"
echo "❌ Failed: $FAILED files"
echo "⚠️  Errors: $ERRORS files"
echo ""
echo "📄 Detailed report: $REPORT_FILE"

exit $((FAILED + ERRORS))

