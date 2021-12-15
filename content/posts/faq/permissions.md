---
title: What permissions does md2blog require?
date: 2021-10-27
---
md2blog is built on [Deno](https://deno.land/) (a runtime for JavaScript and TypeScript), which supports limiting the permissions of scripts.

md2blog is shipped in two different formats:

* A pre-built, all-in-one compiled executable (permissions are *not* configurable)
* A module hosted on https://deno.land/x/ (permissions *are* configurable)

# Pre-built executable
For the pre-built, all-in-one executable, permissions are specified at compile time, so in order to support command line options such as changing the input/output directories or launching a local web server, md2blog has read/write file system access and network access to "localhost".

If you're familiar with Deno's command line arguments, this translates to:

```txt
--allow-read --allow-write --allow-net=localhost
```

# Module hosted on deno.land/x
For the module, you can specify whatever permissions you want the script to have at install time. This means you can omit network access (if you plan to never use the `--serve` option) or limit file system access to specific directories.

Note that md2blog must be able to both read and write to the output directory, so, when limiting file system access, make sure the output directory is specified for both `--allow-read=...` and `--allow-write=...`.

As an example, the following `deno install` command will limit file system access to only the default "content" (input) and "out" (output) directories (and `--serve` will be supported on "localhost"):

```txt
deno install --allow-read=content,out --allow-write=out --allow-net=localhost https://deno.land/x/md2blog/main.ts
```

Note that you can download a specific version or specify a version in the URL to ensure you get a particular version.

Also note that you can add `-r -f` to re-download the latest version of md2blog and replace any existing installation of the script.