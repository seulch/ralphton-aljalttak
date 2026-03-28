#!/bin/bash
# QA Loop — Autonomous testing loop
# Watches for ralph loop completion, runs QA tests, writes QA_TEST.md, fixes PRD
# Usage: ./scripts/qa/qa-loop.sh [max_cycles]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_CYCLES=${1:-10}

cd "$PROJECT_DIR"

echo "========================================="
echo "  QA Loop — aljalttak-gift"
echo "  Max cycles: $MAX_CYCLES"
echo "  Watching for ralph loop output..."
echo "========================================="

for cycle in $(seq 1 $MAX_CYCLES); do
  echo ""
  echo "======================================="
  echo "  QA Cycle $cycle of $MAX_CYCLES"
  echo "======================================="

  # Wait for ralph to finish an iteration or complete
  echo "Waiting for ralph loop signal..."
  while true; do
    if [ -f "$PROJECT_DIR/.ralph-status" ]; then
      STATUS=$(cat "$PROJECT_DIR/.ralph-status")
      if [[ "$STATUS" == "RALPH_DONE" || "$STATUS" == ITERATION_* || "$STATUS" == "RALPH_MAX_ITERATIONS" ]]; then
        echo "Ralph signal received: $STATUS"
        rm -f "$PROJECT_DIR/.ralph-status"
        break
      fi
    fi
    sleep 10
  done

  # Check if there's code to test (package.json exists)
  if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "No package.json yet — ralph hasn't scaffolded. Waiting..."
    continue
  fi

  # Run QA agent
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/QA_PROMPT.md" 2>&1 | tee /dev/stderr) || true

  # Check if QA passed everything
  if echo "$OUTPUT" | grep -q "<promise>QA_PASS</promise>"; then
    echo ""
    echo "QA passed all tests!"

    # If ralph is also done, we're finished
    if [ "$STATUS" == "RALPH_DONE" ]; then
      echo "Both Ralph and QA complete. Ship it!"
      exit 0
    fi
  fi

  # Signal ralph that QA cycle is done (ralph reads QA_TEST.md)
  echo "QA_CYCLE_$cycle" > "$PROJECT_DIR/.qa-status"

  echo "QA Cycle $cycle complete. Continuing..."
  sleep 2
done

echo ""
echo "QA reached max cycles ($MAX_CYCLES)."
exit 1
