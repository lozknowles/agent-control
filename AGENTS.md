# Repository operator guidance

- Ubuntu SSH endpoints in this operator environment use port **2222**. Use `ssh -p 2222` unless the operator explicitly provides another port; do not assume port 22 or ask for the port again.
- Keep experimental qualification isolated from production services, protected ports and historical accounting.
- Freeze the candidate commit before complete regression runs. Do not edit source during those runs.
- Do not push, merge, tag, publish or deploy without explicit operator approval.
