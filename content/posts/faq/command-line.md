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

Note that `--serve` implies `--watch`. Also note that `--serve` does *not* affect the build output (the automatic reloading code is injected by the test web server, and is not present in the files on disk).

# Recommended options
Here are some recommended command lines:

## For local testing (no drafts)
```txt
md2blog --clean --serve
```

## For local testing (with drafts)
```txt
md2blog --clean --serve --drafts
```

## For building (without serving)
```txt
md2blog --clean
```
