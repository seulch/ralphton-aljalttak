#!/bin/bash
# QA Loop — Watches git commits, runs QA after each new commit
# Works with ANY ralph implementation (OMC ralph, ralph-loop.sh, manual)
# Usage: ./scripts/qa/qa-loop.sh [max_cycles]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAX_CYCLES=${1:-10}
DEADLINE=${AJT_DEADLINE:-$(($(date +%s) + 9600))}  # 2h40m default
POLL_INTERVAL=30  # Check for new commits every 30 seconds
MIN_WAIT=60       # Wait at least 60s between QA cycles (let ralph do multiple commits)

cd "$PROJECT_DIR"

LAST_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

echo "========================================="
echo "  QA Loop — AJT-gift"
echo "  Max cycles: $MAX_CYCLES"
echo "  Watching git commits (poll every ${POLL_INTERVAL}s)"
echo "  Starting commit: ${LAST_COMMIT:0:7}"
echo "========================================="

for cycle in $(seq 1 $MAX_CYCLES); do
  # Check deadline
  REMAINING=$((DEADLINE - $(date +%s)))
  if [ $REMAINING -le 0 ]; then
    echo ""
    echo "⏰ DEADLINE REACHED — stopping QA safely"
    git add -A && git commit -m "qa: deadline reached after cycle $((cycle-1))" 2>/dev/null
    git push origin HEAD 2>/dev/null
    exit 0
  fi

  MINS_LEFT=$((REMAINING / 60))
  echo ""
  echo "======================================="
  echo "  QA Cycle $cycle of $MAX_CYCLES ($MINS_LEFT min remaining)"
  echo "  Waiting for new commits..."
  echo "======================================="

  # Wait for new commit(s) from ralph
  while true; do
    # Check deadline while waiting
    if [ $((DEADLINE - $(date +%s))) -le 0 ]; then
      echo "⏰ DEADLINE REACHED while waiting"
      git add -A && git commit -m "qa: deadline reached while waiting" 2>/dev/null
      git push origin HEAD 2>/dev/null
      exit 0
    fi

    CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")
    if [ "$CURRENT_COMMIT" != "$LAST_COMMIT" ]; then
      NEW_COMMITS=$(git log --oneline "$LAST_COMMIT".."$CURRENT_COMMIT" 2>/dev/null | wc -l)
      echo "🔔 Detected $NEW_COMMITS new commit(s) since last QA"
      echo "   Latest: $(git log --oneline -1)"
      LAST_COMMIT=$CURRENT_COMMIT

      # Wait a bit more — ralph might be doing multiple commits in a row
      echo "   Waiting ${MIN_WAIT}s for ralph to finish current batch..."
      sleep $MIN_WAIT

      # Update in case more commits came in during wait
      LAST_COMMIT=$(git rev-parse HEAD)
      break
    fi

    sleep $POLL_INTERVAL
  done

  # Check if there's code to test
  if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "No package.json yet — ralph hasn't scaffolded. Waiting..."
    continue
  fi

  echo "🧪 Running QA agent..."

  # Run QA agent — let it finish naturally (never kill mid-test)
  OUTPUT=$(claude --dangerously-skip-permissions --print < "$SCRIPT_DIR/QA_PROMPT.md" 2>&1 | tee /dev/stderr) || true

  # Check if QA passed everything
  if echo "$OUTPUT" | grep -q "<promise>QA_PASS</promise>"; then
    echo ""
    echo "✅ QA passed all tests! Cycle $cycle complete."
    echo "QA_PASS" > "$PROJECT_DIR/.qa-status"
    exit 0
  fi

  echo "QA Cycle $cycle complete. Issues found — waiting for ralph to fix..."
  sleep 2
done

echo ""
echo "QA reached max cycles ($MAX_CYCLES)."
exit 1
