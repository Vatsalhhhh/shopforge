#!/usr/bin/env python3
"""Generate a single-file HTML summary dashboard from pytest + playwright results."""
import argparse
import json
import os
import re
from datetime import datetime
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--api-pass",     type=int, default=0)
parser.add_argument("--api-fail",     type=int, default=0)
parser.add_argument("--api-total",    type=int, default=0)
parser.add_argument("--api-duration", type=int, default=0)
parser.add_argument("--e2e-pass",     type=int, default=0)
parser.add_argument("--e2e-fail",     type=int, default=0)
parser.add_argument("--e2e-total",    type=int, default=0)
parser.add_argument("--e2e-duration", type=int, default=0)
parser.add_argument("--run-api",      default="true")
parser.add_argument("--run-e2e",      default="true")
parser.add_argument("--output",       default="reports/summary.html")
args = parser.parse_args()

RUN_API = args.run_api.lower() == "true"
RUN_E2E = args.run_e2e.lower() == "true"
REPORTS = Path(args.output).parent

# Load detailed pytest results
api_tests = []
try:
    data = json.loads((REPORTS / "api-results.json").read_text())
    for t in data.get("tests", []):
        outcome = t.get("outcome", "unknown")
        name = t.get("nodeid", "")
        duration = round(t.get("duration", 0), 3)
        message = ""
        if outcome == "failed":
            message = t.get("call", {}).get("longrepr", "") or t.get("setup", {}).get("longrepr", "")
            if isinstance(message, dict):
                message = message.get("reprcrash", {}).get("message", "")
            message = str(message)[:300]
        api_tests.append({"name": name, "outcome": outcome, "duration": duration, "message": message})
except Exception:
    pass

# Load detailed playwright results
e2e_tests = []
try:
    data = json.loads((REPORTS / "e2e-results.json").read_text())
    for suite in data.get("suites", []):
        for spec in suite.get("suites", []) + [suite]:
            for t in spec.get("specs", []):
                for r in t.get("tests", []):
                    outcome = "passed" if r.get("status") == "expected" else "failed"
                    duration = round(sum(step.get("duration", 0) for step in r.get("results", [])) / 1000, 2)
                    message = ""
                    if outcome == "failed":
                        for res in r.get("results", []):
                            for err in res.get("errors", []):
                                message = err.get("message", "")[:300]
                                break
                    e2e_tests.append({
                        "name": t.get("title", ""),
                        "file": spec.get("title", ""),
                        "outcome": outcome,
                        "duration": duration,
                        "message": message,
                    })
except Exception:
    pass

total_pass = args.api_pass + args.e2e_pass
total_fail = args.api_fail + args.e2e_fail
total_all  = args.api_total + args.e2e_total
overall_ok = total_fail == 0

def status_badge(passed, failed, total):
    if total == 0:
        return '<span class="badge skip">skipped</span>'
    if failed == 0:
        return f'<span class="badge pass">✓ {passed}/{total} passed</span>'
    return f'<span class="badge fail">✗ {failed} failed / {total} total</span>'

def test_rows(tests, has_file=False):
    if not tests:
        return '<tr><td colspan="4" class="empty">No test data available</td></tr>'
    rows = []
    for t in tests:
        cls = t["outcome"]
        icon = "✓" if cls == "passed" else ("✗" if cls == "failed" else "○")
        badge = f'<span class="dot {cls}">{icon}</span>'
        name = t["name"]
        if has_file:
            name = f'<small class="file">{t.get("file","")}</small> {t["name"]}'
        msg = f'<div class="errmsg">{t["message"]}</div>' if t.get("message") else ""
        rows.append(f'<tr class="row-{cls}"><td>{badge}</td><td>{name}{msg}</td><td>{t["duration"]}s</td></tr>')
    return "\n".join(rows)

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShopForge Test Report — {datetime.now().strftime("%Y-%m-%d %H:%M")}</title>
<style>
  :root {{
    --green:#22c55e; --red:#ef4444; --yellow:#f59e0b;
    --blue:#6366f1;  --gray:#6b7280; --bg:#f9fafb;
    --card:#fff; --border:#e5e7eb; --text:#111827; --sub:#6b7280;
  }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
          background:var(--bg); color:var(--text); padding:32px 16px; }}
  h1 {{ font-size:1.75rem; font-weight:800; }}
  h2 {{ font-size:1.1rem; font-weight:700; margin-bottom:12px; }}
  .ts {{ color:var(--sub); font-size:.85rem; margin-top:4px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin:24px 0; }}
  .card {{ background:var(--card); border:1px solid var(--border); border-radius:16px;
           padding:20px 24px; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
  .card.ok  {{ border-left:4px solid var(--green); }}
  .card.bad {{ border-left:4px solid var(--red);   }}
  .card.neu {{ border-left:4px solid var(--gray);  }}
  .num {{ font-size:2.4rem; font-weight:800; line-height:1; }}
  .num.green {{ color:var(--green); }} .num.red {{ color:var(--red); }}
  .num.gray  {{ color:var(--gray);  }} .num.blue {{ color:var(--blue); }}
  .lbl {{ font-size:.8rem; color:var(--sub); margin-top:6px; text-transform:uppercase; letter-spacing:.05em; }}
  .section {{ background:var(--card); border:1px solid var(--border); border-radius:16px;
              padding:24px; margin-top:20px; box-shadow:0 1px 3px rgba(0,0,0,.06); }}
  table {{ width:100%; border-collapse:collapse; font-size:.875rem; }}
  th {{ text-align:left; padding:8px 12px; background:#f3f4f6; color:var(--sub);
        font-weight:600; font-size:.75rem; text-transform:uppercase; }}
  td {{ padding:9px 12px; border-bottom:1px solid #f3f4f6; vertical-align:top; }}
  tr:last-child td {{ border-bottom:none; }}
  .row-passed:hover td {{ background:#f0fdf4; }}
  .row-failed:hover td {{ background:#fef2f2; }}
  .dot {{ display:inline-flex; align-items:center; justify-content:center;
          width:22px; height:22px; border-radius:50%; font-size:.75rem; font-weight:700; }}
  .dot.passed {{ background:#dcfce7; color:var(--green); }}
  .dot.failed {{ background:#fee2e2; color:var(--red);   }}
  .dot.skipped {{ background:#fef9c3; color:var(--yellow); }}
  .errmsg {{ font-size:.78rem; color:var(--red); margin-top:4px;
             font-family:monospace; white-space:pre-wrap; word-break:break-all; }}
  .file {{ color:var(--sub); margin-right:6px; }}
  .badge {{ display:inline-flex; align-items:center; padding:3px 10px;
            border-radius:20px; font-size:.8rem; font-weight:600; }}
  .badge.pass {{ background:#dcfce7; color:#15803d; }}
  .badge.fail {{ background:#fee2e2; color:#b91c1c; }}
  .badge.skip {{ background:#f3f4f6; color:var(--sub); }}
  .links {{ display:flex; gap:12px; margin-top:20px; flex-wrap:wrap; }}
  .link-btn {{ display:inline-flex; align-items:center; gap:6px; padding:8px 16px;
               background:var(--blue); color:#fff; border-radius:10px;
               text-decoration:none; font-size:.875rem; font-weight:600; }}
  .link-btn:hover {{ opacity:.9; }}
  .link-btn.gray {{ background:#374151; }}
  .overall {{ display:flex; align-items:center; gap:16px; padding:20px 24px;
              border-radius:16px; margin:16px 0;
              background:{"#f0fdf4; border:1px solid #bbf7d0;" if overall_ok else "#fef2f2; border:1px solid #fecaca;"} }}
  .overall-icon {{ font-size:2.5rem; }}
  .overall-text h3 {{ font-size:1.2rem; font-weight:700; color:{"#15803d" if overall_ok else "#b91c1c"}; }}
  .overall-text p  {{ font-size:.875rem; color:var(--sub); margin-top:2px; }}
  .empty {{ text-align:center; color:var(--sub); padding:20px; }}
  @media (max-width:600px) {{ .grid {{ grid-template-columns:1fr 1fr; }} }}
</style>
</head>
<body>

<h1>ShopForge — Test Report</h1>
<p class="ts">Generated {datetime.now().strftime("%A, %d %B %Y at %H:%M:%S")}</p>

<div class="overall">
  <div class="overall-icon">{"✅" if overall_ok else "❌"}</div>
  <div class="overall-text">
    <h3>{"All tests passed" if overall_ok else f"{total_fail} test(s) failed"}</h3>
    <p>{total_pass} passed · {total_fail} failed · {total_all} total</p>
  </div>
</div>

<div class="grid">
  <div class="card {'ok' if args.api_fail==0 else 'bad'}">
    <div class="num {'green' if args.api_fail==0 else 'red'}">{args.api_pass}</div>
    <div class="lbl">API Tests Passed</div>
  </div>
  <div class="card {'bad' if args.api_fail>0 else 'neu'}">
    <div class="num {'red' if args.api_fail>0 else 'gray'}">{args.api_fail}</div>
    <div class="lbl">API Tests Failed</div>
  </div>
  <div class="card {'ok' if args.e2e_fail==0 else 'bad'}">
    <div class="num {'green' if args.e2e_fail==0 else 'red'}">{args.e2e_pass}</div>
    <div class="lbl">E2E Tests Passed</div>
  </div>
  <div class="card {'bad' if args.e2e_fail>0 else 'neu'}">
    <div class="num {'red' if args.e2e_fail>0 else 'gray'}">{args.e2e_fail}</div>
    <div class="lbl">E2E Tests Failed</div>
  </div>
  <div class="card neu">
    <div class="num blue">{args.api_total + args.e2e_total}</div>
    <div class="lbl">Total Tests</div>
  </div>
  <div class="card neu">
    <div class="num gray">{args.api_duration + args.e2e_duration}s</div>
    <div class="lbl">Total Duration</div>
  </div>
</div>

<!-- API Tests -->
<div class="section">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h2>🔌 API Tests (pytest)</h2>
    {status_badge(args.api_pass, args.api_fail, args.api_total)}
  </div>
  <table>
    <thead><tr><th width="40"></th><th>Test</th><th width="80">Duration</th></tr></thead>
    <tbody>{test_rows(api_tests)}</tbody>
  </table>
</div>

<!-- E2E Tests -->
<div class="section">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
    <h2>🖥️ E2E Tests (Playwright)</h2>
    {status_badge(args.e2e_pass, args.e2e_fail, args.e2e_total)}
  </div>
  <table>
    <thead><tr><th width="40"></th><th>Test</th><th width="80">Duration</th></tr></thead>
    <tbody>{test_rows(e2e_tests, has_file=True)}</tbody>
  </table>
</div>

<!-- Report links -->
<div class="links">
  <a class="link-btn" href="api-report.html">📄 Full API Report</a>
  <a class="link-btn gray" href="e2e-report/index.html">🎭 Full E2E Report</a>
</div>

</body>
</html>"""

Path(args.output).write_text(html)
print(f"Summary written → {args.output}")
