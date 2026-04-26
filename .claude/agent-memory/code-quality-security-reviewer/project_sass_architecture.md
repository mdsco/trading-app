---
name: Sass architecture and build setup
description: Details of the Sass conversion: partials structure, build scripts, compiled output, and known issues found in review
type: project
---

CSS/Sass was converted from a flat `public/styles.css` into modular Sass partials under `public/scss/`. Compiled output still lives at `public/styles.css` (served by the app). A source map `public/styles.css.map` is also generated and committed.

**Why:** Maintainability improvement — dark mode theming via CSS custom properties in `_variables.scss`, component partials per UI section.

**How to apply:** When reviewing future CSS/Sass changes, check that: (1) partials don't use Sass variables (they rely entirely on CSS custom properties — no `$` vars), (2) `_responsive.scss` cross-references selectors from `_header.scss`, `_charts.scss`, and `_tables.scss` so ordering in `main.scss` must be preserved, (3) `sass:watch` output target is `public/styles.css` which is checked in.

Known issues found during 2026-04-16 review:
- `styles.css.map` is committed but not gitignored — should be gitignored for production or kept deliberately
- `start` script does NOT run sass compile, so a stale `styles.css` would be served if not pre-compiled
- `_buttons.scss` `&-theme-toggle` nests a `border` property that implicitly overrides `.btn`'s `border: none` — intentional but fragile
- `!important` used in `.empty-message` padding in `_tables.scss` — only one instance, but worth flagging
- No Sass variables (`$`) are used anywhere — the entire theming system is CSS custom properties only; this is fine but means Sass compile-time checks on token names are not possible
- `_responsive.scss` is a cross-cutting partial that modifies selectors defined in other files — this is an established pattern here, not a bug
