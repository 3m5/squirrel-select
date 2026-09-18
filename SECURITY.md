# Security Policy

## Supported versions

Squirrel Select is pre-1.0. Only the latest published release receives security fixes;
there are no maintained backport branches.

| Version | Supported |
| :-- | :-- |
| 0.1.x | yes |
| < 0.1 | no |

## Reporting a vulnerability

Report privately through GitHub Security Advisories:
https://github.com/3m5/squirrel-select/security/advisories/new

Do not open a public issue, pull request or discussion for a suspected vulnerability —
that is the disclosure.

Please include:

- affected version and how the library is loaded (npm package, bundled `dist/`)
- a minimal reproduction, ideally the `<select>` markup and attributes involved
- impact you believe it has

## What to expect

- acknowledgement within 5 working days
- an assessment with a fix or a rejection, and the reason, within 30 days
- credit in the advisory and the release notes, unless you ask to stay anonymous

Fixes are published as a new release, and the advisory is made public once that release
is available on npm.

## Scope

Squirrel Select runs entirely in the browser and renders the content of an existing
`<select>` element. Markup and option values already under an attacker's control before
the library initializes are out of scope — it reflects the DOM it is given. In scope is
anything where Squirrel Select turns that input into script execution, escapes the
element it was applied to, or breaks the selector escaping it performs internally.
