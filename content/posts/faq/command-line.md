---
title: What are all the command line options?
date: 2021-10-30
---
```txt
$ md2blog --help
Options:
  -c, --clean         Clean output directory before processing
  -d, --drafts        Include drafts in output
  -s, --serve         Serve web site, with automatic reloading
  -w, --watch         Watch for changes and rebuild automatically
  -i, --input <dir>   Input directory (default: "content")
  -o, --output <dir>  Output directory (default: "out")
  --copyright         Display open source software copyright notices
  -h, -?, --help      Display usage information
```

Note that `--serve` implies `--watch`.