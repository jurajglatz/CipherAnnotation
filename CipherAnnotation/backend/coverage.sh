#!/usr/bin/env bash
# Run backend unit tests with code coverage and generate an HTML report.
# Usage (from repo root):  ./backend/coverage.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESULTS_DIR="$REPO_ROOT/backend/CipherAnnotation.Tests/TestResults"
REPORT_DIR="$REPO_ROOT/backend/CipherAnnotation.Tests/coverage-report"

# Clear stale runs so reportgenerator sees only the latest cobertura file.
rm -rf "$RESULTS_DIR" "$REPORT_DIR"

dotnet test "$REPO_ROOT/backend/CipherAnnotation.Tests/CipherAnnotation.Tests.csproj" \
  --collect:"XPlat Code Coverage" \
  --results-directory "$RESULTS_DIR"

dotnet tool run reportgenerator \
  -reports:"$RESULTS_DIR/**/coverage.cobertura.xml" \
  -targetdir:"$REPORT_DIR" \
  -reporttypes:Html

echo
echo "HTML report: $REPORT_DIR/index.html"
