# Runbook RB-01: Zero-Downtime Deployment & Automated Rollback

> **Severity / Scope:** P1 / Release  
> **Last Tested:** 2026-11-21  
> **Target Services:** Core Application Stack  

---

## 1. Trigger Conditions & Symptoms

Execute this procedure when:
- Production release deployment execution.
- Elevated 5xx error rate post-deployment (> 1%).

---

## 2. Immediate Diagnostic Checks

Run the following commands to assess system health:
```bash
curl -sS https://localhost/healthz || tail -n 50 logs/app.jsonl
```

---

## 3. Step-by-Step Remediation Procedure

1. **Step 1: Isolate Traffic / Enable Maintenance Mode**:
   ```bash
   systemctl pause-traffic || docker-compose stop edge-router
   ```
2. **Step 2: Execute Recovery Operation**:
   ```bash
   git checkout <stable-tag> && make deploy
   ```
3. **Step 3: Verification & Sanity Check**:
   ```bash
   make check && curl -sS https://localhost/healthz
   ```

---

## 4. Rollback / Abort Plan

If remediation fails or metrics deteriorate:
```bash
make rollback-previous-release
```
