# Security Policy

## Supported versions

Only the latest release receives security fixes; there are no maintained backport branches.

| Version | Supported |
| :-- | :-- |
| 1.x | yes |
| 0.x | until 1.0.0 is released, then no |

## Reporting a vulnerability

Report privately through GitHub Security Advisories:
https://github.com/3m5/squirrel-select/security/advisories/new

Do not open a public issue, pull request or discussion for a suspected vulnerability —
that is the disclosure.

Please include:

- affected version and how the stylesheet is loaded (npm package, CDN, self-hosted file)
- a minimal reproduction, ideally the `<select>` markup and the browser involved
- impact you believe it has

## What to expect

- acknowledgement within 5 working days
- an assessment with a fix or a rejection, and the reason, within 30 days
- credit in the advisory and the release notes, unless you ask to stay anonymous

Fixes are published as a new release, and the advisory is made public once that release
is available on npm.

## Scope

SquirrelSelect 1.x is a plain CSS file. It contains no JavaScript, and it neither reads nor
sends data. Its only `url()` is an embedded `data:` image; it loads nothing from other hosts
and imports no other files.

In scope is anything in the published stylesheet that could be abused, for example:

- CSS that loads content from elsewhere, such as a `url()` or `@import` pointing to a host
- selectors that leak page data, such as attribute selectors that trigger a request for
  matching values
- rules that hide, overlay or disguise content outside the select it was applied to

Out of scope are your own CSS that overrides ours, markup and option text already under an
attacker's control, and browser bugs that SquirrelSelect cannot work around. If you are
unsure, report it anyway.

Optional JavaScript modules are planned after 1.0. This section will be extended when the
first one ships.
