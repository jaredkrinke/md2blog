---
title: Why does md2blog require Node/NPM?
date: 2021-10-20
---
Frankly, md2blog requires Node/NPM because I found [Metalsmith](https://metalsmith.io/) (a modular static site generator built on Node/NPM) to be the fastest way for me to get a static dev blog generator to work the way I wanted (and I [examined quite a few static site generators](https://log.schemescape.com/posts/static-site-generators/comparison.html) prior to settling on Metalsmith).

There are certainly downsides to using Node:

* Users have to have Node/NPM, and know a little about how to use them
* The NPM ecosystem tends to have huge dependency trees

Given that (as of the time I'm writing this) I'm the only user of md2blog, I'm favoring ease of development over ease of use.

If there ends up being interest in md2blog, it would make sense to package everything up into a single convenient binary, a la [Hugo](https://gohugo.io/).