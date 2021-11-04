---
title: A zero-config static site generator for dev blogs
---
# Summary
Here's the purpose of md2blog:

> Convert a *self-contained, organized* set of [Markdown](https://guides.github.com/features/mastering-markdown/) posts into a *minimal, but fully functional* static blog, requiring *zero configuration*.

The key differentiator for md2blog is the "self-contained, organized" part. By this, I mean:

* **Relative links between Markdown files (including anchors) "just work"** (and are validated at build time)
* Posts are **implicitly categorized based on directory structure** (supplemental tags are also supported)

Additionally, the produced site is "minimal, but fully functional" in the following sense:

* Page templates use **clean, semantic HTML** with only a few kilobytes of CSS (and no JavaScript)
* **Relative links are used wherever possible**, so the site can be hosted anywhere
  * The site can even be viewed directly from the file system (**no web server required**)
* **Syntax highlighting** is automatically added to code blocks
* An [Atom](https://validator.w3.org/feed/docs/atom.html) feed is automatically generated

Note that "zero configuration" implies that md2blog is highly opinionated, to the point that there are (almost) no options to configure. **Instead of fiddling with options and themes, your focus is strictly on writing and publishing content.**

# Interested?
If you've got [Node and NPM](https://nodejs.org/en/download/) installed already, here's how to get started:

* **[Quick start](quick-start.md)**

# Samples
Want to see an example site? Here are two web sites built with md2blog:

* [My dev blog](https://log.schemescape.com/)
* [The site you're currently reading](index.md) (which isn't a blog, so not the best example)

# Additional resources

* [FAQ](posts/faq/index.html) (e.g. [themes](posts/faq/themes.md), [command line options](posts/faq/command-line.md), [support](posts/faq/support.md))
* [Template repository](https://github.com/jaredkrinke/md2blog-template-site) for creating your own dev blog (see [instructions](quick-start.md#setup))
* [Example repository](https://github.com/jaredkrinke/log) for a real site using md2blog
* [Source code](https://github.com/jaredkrinke/md2blog) for md2blog (TODO: license)