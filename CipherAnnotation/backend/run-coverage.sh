#!/usr/bin/env bash
# Collects code coverage for the backend test suite and produces a report.
# Mirrors the frontend's `npm run test:coverage`.
#
# Usage: ./run-coverage.sh
# Output:
#   TestResults/<guid>/coverage.cobertura.xml  raw coverage data
#   CoverageReport/index.html                  browsable HTML report
#   CoverageReport/Summary.txt                 plain-text summary (printed below)
set -euo pipefail
cd "$(dirname "$0")"

rm -rf TestResults CoverageReport

dotnet test CipherAnnotation.Tests/CipherAnnotation.Tests.csproj \
  --collect:"XPlat Code Coverage" \
  --settings coverlet.runsettings \
  --results-directory ./TestResults \
  --nologo

dotnet tool restore
dotnet reportgenerator \
  -reports:"TestResults/**/coverage.cobertura.xml" \
  -targetdir:"CoverageReport" \
  -reporttypes:"Html;TextSummary"

echo
cat CoverageReport/Summary.txt
