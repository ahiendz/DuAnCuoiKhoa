---
description: Production debugging workflow for School Manager Pro. Used when UI crashes, API mismatch, role errors, realtime issues or dashboard fails. Forces structured root-cause analysis before writing code.
---

# School Manager Pro – System Audit & Debug Workflow

## Goal
Identify root cause of bug before writing any fix.
Avoid rewriting system blindly.
Work layer-by-layer: FE → API → DB → Auth → Realtime.

---

## Step 1 – System Snapshot

Agent must summarize:

- Frontend stack (React + Vite + Bootstrap + Framer)
- Backend stack (Express + PostgreSQL + JWT)
- Realtime (Socket.IO if enabled)
- Current failing module

Output format:

System Context:
Problem Area:
Affected Layer (FE / BE / DB / Auth / Realtime):

---

## Step 2 – Reproduce & Isolate

Agent must:

- Identify exact failing API
- Compare expected vs actual response
- Check:
  - null / undefined destructuring
  - async race condition
  - incorrect useEffect dependency
  - state mutation errors
  - missing await

Output:

Root Cause Hypothesis (ranked by probability):
1.
2.
3.

---

## Step 3 – API Contract Validation

Validate consistency between:

- DB schema
- Controller response
- Frontend interface

Check for:

- snake_case vs camelCase mismatch
- missing joins
- missing related entity names
- wrong data shape

If mismatch detected → propose normalized contract.

Output:

API Contract Correction Proposal

---

## Step 4 – Auth & Role Guard Audit

Check:

- JWT validation
- Role middleware
- Route access restrictions
- Parent viewing wrong student

Output:

Access Control Findings:
Refactor Plan:

---

## Step 5 – Performance & Stability

Check:

- N+1 queries
- Heavy dashboard aggregation
- Blocking PDF generation
- WebSocket memory leaks

Output:

Performance Risk Level:
Optimization Proposal:

---

## Step 6 – Patch Plan (Production Safe)

Return:

Patch Plan:
1. Files to modify
2. Code-level fix summary
3. Migration required? (Yes/No)
4. Risk level (Low/Medium/High)
5. Rollback strategy

Do NOT rewrite entire module unless absolutely required.

---

## Step 7 – Commit Strategy

Generate conventional commit:

fix:
refactor:
perf:
feat:
