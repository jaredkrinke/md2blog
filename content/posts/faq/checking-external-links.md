---
title: How do I validate external links?
date: 2021-11-03
---
Currently, md2blog only validates internal links at build time (because validating external links can be complicated and slow).

For now, the recommended solution is to periodically use a separate external link checking tool. If you have Deno installed, you can use the following tool (assuming you're at your repository root and the output folder is written to `out`):

```text
deno run --allow-read=. --allow-net https://deno.land/x/link_checker/check.ts -x -c 20 out/index.html
```
