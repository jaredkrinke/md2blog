---
title: Why is the download so big?
date: 2021-10-28
---
md2blog is built on [Deno](https://deno.land/) and written in TypeScript. For ease of installation, the pre-built, all-in-one compiled executable includes a complete JavaScript runtime. This runtime makes up the bulk of the download (and it is redundant if you already have Deno installed).

If Deno is already installed, md2blog can simply be run (or installed/cached) from deno.land/x (using `deno run` or `deno install`, with appropriate [permission flags](permissions.md)), at which point the download is around 2 MB (most of which is syntax highlighting code). See the [quick start](../../quick-start.md#setup) for an example `deno install` command line.