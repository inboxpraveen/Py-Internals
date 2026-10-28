## Summary

<!-- What does this change and why? Link the issue or discussion if there is one. -->

## Checklist

- [ ] `node tools/check_sessions.js` passes
- [ ] `python tools/build_seo.py nocards` was run, and a second run changes nothing (generated files are in this PR)
- [ ] Every Python claim was run in a real interpreter, and any refcount shown was measured
- [ ] Checked at 320, 375, 768 and a desktop width, with no sideways scrolling
- [ ] No new dependency, no hard-coded colours, no hand edits to generated files
- [ ] Layout change? A screenshot is attached
