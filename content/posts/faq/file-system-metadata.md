---
title: Why not use file system metadata for dates?
date: 2021-10-24
---
Originally, I wanted to use file system metadata (e.g. date modified) to infer when a post was written, but unfortunately [Git doesn't preserve file system metadata](https://stackoverflow.com/questions/2179722/checking-out-old-files-with-original-create-modified-timestamps/2179825#2179825), and I wanted content to be able to be stored in Git.

Even though I planned to use Git myself, I didn't want to integrate with Git (e.g. looking up the date of a commit that first introduced a file) because md2blog, while highly opinionated, should be storage agnostic.
