#!/bin/bash
# AJT-gift — Dual Loop Runner with 2h40m deadline
# Usage: ./start.sh
#
# Terminal 1: Ralph Loop (builds the app)
# Terminal 2: QA Loop (tests after each ralph iteration)
# Both stop safely at iteration boundaries after 2h40m

DEADLINE_SECONDS=9600  # 2 hours 40 minutes
DEADLINE_TS=$(($(date +%s) + DEADLINE_SECONDS))
DEADLINE_HUMAN=$(date -d "@$DEADLINE_TS" "+%H:%M:%S" 2>/dev/null || date -r "$DEADLINE_TS" "+%H:%M:%S" 2>/dev/null || echo "in ${DEADLINE_SECONDS}s")

export AJT_DEADLINE=$DEADLINE_TS

echo "========================================="
echo "  AJT-gift — Ralphthon Dual Loop"
echo "  Deadline: $DEADLINE_HUMAN ($DEADLINE_SECONDS seconds)"
echo "========================================="

mkdir -p logs

echo "Starting Ralph Loop..."
./scripts/ralph/ralph-loop.sh > logs/ralph.log 2>&1 &
RALPH_PID=$!

echo "Starting QA Loop..."
./scripts/qa/qa-loop.sh > logs/qa.log 2>&1 &
QA_PID=$!

echo ""
echo "Ralph PID: $RALPH_PID | QA PID: $QA_PID"
echo "Monitor:"
echo "  tail -f logs/ralph.log"
echo "  tail -f logs/qa.log"
echo "  cat QA_TEST.md"
echo ""
echo "Stop: kill $RALPH_PID $QA_PID"

wait $RALPH_PID
wait $QA_PID

echo ""
echo "========================================="
echo "  Both loops finished."
echo "  Final push..."
echo "========================================="
git add -A && git commit -m "chore: final state at deadline" && git push origin HEAD 2>/dev/null
