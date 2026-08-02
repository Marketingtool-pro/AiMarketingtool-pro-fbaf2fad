# Security Policy

## Supported Versions

The currently supported production version line for this repository is:

| Version | Supported |
| ------- | --------- |
| 1.5.x   | ✅ |
| < 1.5   | ❌ |

Older versions may not receive security fixes.

## Reporting a Vulnerability

If you discover a security vulnerability, please do **not** open a public GitHub issue.

Instead, report it privately via one of the following channels:

- Email: **help@marketingtool.pro**
- GitHub Security Advisories: use the repository's **Security** tab and click **Report a vulnerability**

(Project maintainers: replace `help@marketingtool.pro` with the real monitored security contact address.)

When reporting, please include:

- A clear description of the issue
- Steps to reproduce
- Affected files, components, or endpoints
- Potential impact
- Any suggested remediation, if known

## What to Expect

After a report is received, maintainers should:

1. Acknowledge receipt as soon as practical
2. Validate and assess the report
3. Work on a fix for confirmed vulnerabilities
4. Coordinate disclosure after remediation, when appropriate

## Scope

This repository includes:

- The React Native / Expo mobile application
- Firebase Functions code under `functions/`
- Appwrite function code under `appwrite-functions/`

## Secrets and Sensitive Data

Please do not include secrets, access tokens, API keys, credentials, or personal user data in reports or pull requests.

Project maintainers should keep secrets out of source control and use environment variables or secret-management systems where applicable.
