# Security

Keep operator tokens, provider credentials, private configuration and live evidence out of Git, screenshots and issue reports.

The local dashboard defaults to loopback. Operator actions require authentication and remain subject to job permissions and approvals. Discovery does not grant execution authority; remote access and model installation require their own configuration and permission.

Do not expose the dashboard publicly or disable authentication to solve an installation problem. See [installation troubleshooting](docs/installation-first-run.md#troubleshooting) and the [existing security design](docs/security-3.6.md).

Report a suspected vulnerability privately using GitHub private vulnerability reporting if available. Do not post credentials or exploitable private deployment details in a public issue.
