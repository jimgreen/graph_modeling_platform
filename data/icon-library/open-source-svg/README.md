# Open Source SVG Icon Library

This directory is the unified SVG icon source exposed to the application.

Output:

- Total icons: 7862
- Categories: 118
- Merged compatibility sources: docer-free-compatible, office-fluent-compatible
- Skipped exact SVG duplicates during merge: 0

Rebuild:

```bash
node scripts/generate-open-source-svg-icons.mjs
node scripts/generate-docer-compatible-icons.mjs
node scripts/generate-office-fluent-icons.mjs
node scripts/merge-icon-libraries-into-open-source.mjs
node scripts/generate-icon-library-catalog.mjs
```
