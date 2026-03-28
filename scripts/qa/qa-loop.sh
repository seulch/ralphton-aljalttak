#!/bin/bash
# QA Loop — Autonomous testing with safe deadline
# Waits for ralph iterations, tests, writes QA_TEST.md
# Stops BETWEEN cycles (never mid-test)
# Usage: ./scripts/qa/qa-loop.sh [max_cycles]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_CYCLES=${1:-10}
DEADLINE=${AJT_DEADLINE:-$(($(date +%s) + 9600))}  # Default 2h40m if not set by start.sh

cd "$PROJECT_DIR"

echo "========================================="
echo "  QA Loop — AJT-gift"
echo "  Max cycles: $MAX_CYCLES"
echo "  Deadline: $(date -d @$DEADLINE '+%H:%M:%S' 2>/dev/null || date -r $DEADLINE '+%H:%M:%S' 2>/dev/null || echo 'in $((DEADLINE - $(date +%s)))s')"
echo "  Watching for ralph loop output..."
echo "========================================="

for cycle in $(seq 1 $MAX_CYCLES); do
  # Check deadline BEFORE starting a new cycle
  REMAINING=$((DEADLINE - $(date +%s)))
  if [ $REMAINING -le 0 ]; then
    echo ""
    echo "⏰ DEADLINE REACHED — stopping QA safely before cycle $cycle"
    git add -A && git commit -m "qa: deadline reached after cycle $((cycle-1))" 2>/dev/null && git push origin HEAD 2>/dev/null
    exit 0
  fi

  MINS_LEFT=$((REMAINING / 60))
  echo ""
  echo "======================================="
  echo "  QA Cycle $cycle of $MAX_CYCLES ($MINS_LEFT min remaining)"
  echo "======================================="

  # Wait for ralph signal, but also check deadline while waiting
  echo "Waiting for ralph loop signal..."
  while true; do
    # Check deadline while waiting
    if [ $((DEADLINE - $(date +%s))) -le 0 ]; then
      echo "⏰ DEADLINE REACHED while waiting for ralph"
      git add -A && git commit -m "qa: deadline reached while waiting" 2>/dev/null && git push origin HEAD 2>/dev/null
      exit 0
    fi

    if [ -f "$PROJECT_DIR/.ralph-status" ]; then
      STATUS=$(cat "$PROJECT_DIR/.ralph-status")
      if [[ "$STATUS" == "RALPH_DONE" || "$STATUS" == ITERATION_* || "$STATUS" == "RALPH_MAX_ITERATIONS" || "$STATUS" == "RALPH_DEADLINE" ]]; then
        echo "Ralph signal received: $STATUS"
        rm -f "$PROJECT_DIR/.ralph-status"
        break
      fi
    fi
    sleep 10
  done

  # Check if there's code to test
  if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "No package.json yet — ralph hasn't scaffolded. Waiting..."
    continue
  fi

  # Run QA agent — let it finish naturally
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/QA_PROMPT.md" 2>&1 | tee /dev/stderr) || true

  # Check if QA passed everything
  if echo "$OUTPUT" | grep -q "<promise>QA_PASS</promise>"; then
    echo ""
    echo "✅ QA passed all tests!"

    if [[ "$STATUS" == "RALPH_DONE" || "$STATUS" == "RALPH_DEADLINE" ]]; then
      echo "Both Ralph and QA complete. Ship it!"
      exit 0
    fi
  fi

  # Signal ralph that QA cycle is done
  echo "QA_CYCLE_$cycle" > "$PROJECT_DIR/.qa-status"

  echo "QA Cycle $cycle complete. Continuing..."
  sleep 2
done

echo ""
echo "QA reached max cycles ($MAX_CYCLES)."
exit 1
