#!/bin/bash
# Ralph Loop — Autonomous implementation with safe deadline
# Stops BETWEEN iterations (never mid-code), commits before stopping
# Usage: ./scripts/ralph/ralph-loop.sh [max_iterations]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_ITERATIONS=${1:-30}
DEADLINE=${AJT_DEADLINE:-$(($(date +%s) + 9600))}  # Default 2h40m if not set by start.sh

cd "$PROJECT_DIR"

echo "========================================="
echo "  Ralph Loop — AJT-gift"
echo "  Max iterations: $MAX_ITERATIONS"
echo "  Deadline: $(date -d @$DEADLINE '+%H:%M:%S' 2>/dev/null || date -r $DEADLINE '+%H:%M:%S' 2>/dev/null || echo 'in $((DEADLINE - $(date +%s)))s')"
echo "========================================="

for i in $(seq 1 $MAX_ITERATIONS); do
  # Check deadline BEFORE starting a new iteration
  REMAINING=$((DEADLINE - $(date +%s)))
  if [ $REMAINING -le 0 ]; then
    echo ""
    echo "⏰ DEADLINE REACHED — stopping safely before iteration $i"
    echo "   All previous iterations are committed and safe."
    git add -A && git commit -m "chore: deadline reached after iteration $((i-1))" 2>/dev/null && git push origin HEAD 2>/dev/null
    echo "RALPH_DEADLINE" > "$PROJECT_DIR/.ralph-status"
    exit 0
  fi

  MINS_LEFT=$((REMAINING / 60))
  echo ""
  echo "======================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($MINS_LEFT min remaining)"
  echo "======================================="

  # Run one iteration — let it finish naturally (never kill mid-code)
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/RALPH_PROMPT.md" 2>&1 | tee /dev/stderr) || true

  # Check for completion
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "✅ Ralph completed all tasks at iteration $i!"
    echo "RALPH_DONE" > "$PROJECT_DIR/.ralph-status"
    exit 0
  fi

  # Signal QA loop that an iteration finished
  echo "ITERATION_$i" > "$PROJECT_DIR/.ralph-status"

  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS)."
echo "RALPH_MAX_ITERATIONS" > "$PROJECT_DIR/.ralph-status"
exit 1
