---
title: What is causing this error?
date: 2021-11-27
---
Here are some issues that may be common:

# "Permission denied" error when running on Linux
Ensure that `md2blog` is executable (if not: `chmod +x md2blog`).

# "content" not found error
By default, md2blog reads from an input directory named "content". You can change the input directory using [command line options](command-line.md) (namely `--input`).

# "site.json" not found error
md2blog reads the site title (and optional description/URL/theme) from `content/site.json`. See the [quick start](../../quick-start.md#setup) for more details.

# My site built fine before, but now it's not building anything
Check the console output to see if there is a message about broken relative links, e.g.:

```txt
Error: The site has broken relative links:

From "posts/faq/common-problems.html" to "../../quick-start.html#Setup"
```

If you're running with `--clean` and there is a broken relative link, the build is aborted *after* the output directory is cleaned, so the output directory will be empty. Just fix the broken link and rebuild.

# I hit some other error not listed here
Consult the FAQ entry on [general support info](support.md). It contains links to the discussion board and issue tracker.