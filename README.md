# md2blog
A zero-config static site generator for dev blogs

# What does md2blog do?
> Convert a *self-contained, organized* set of [Markdown](https://guides.github.com/features/mastering-markdown/) posts into a *minimal, but fully functional* static blog, requiring *zero configuration*.

# How is md2blog different?
The key differentiator for md2blog is the "self-contained, organized" part. By this, I mean:

* **Relative links between Markdown files (including anchors) "just work"** (and are validated at build time)
* Posts are **implicitly categorized based on directory structure** (supplemental tags are also supported)

Additionally, the produced site is "minimal, but fully functional" in the following sense:

* Page templates use **clean, semantic HTML** with only a few kilobytes of CSS (and no JavaScript)
* **Relative links are used wherever possible**, so the site can be hosted anywhere
  * A local web server with automatic reloading is provided, but the site can even be viewed directly from the file system
* **Syntax highlighting** is automatically added to code blocks
* An [Atom](https://validator.w3.org/feed/docs/atom.html) feed is automatically generated

Note that "zero configuration" implies that md2blog is highly opinionated, to the point that there are (almost) no options to configure. **Instead of fiddling with options and themes, your focus is strictly on writing and publishing content.**

# How do I use md2blog?
Here's how to get started:

* **[Quick start](https://jaredkrinke.github.io/md2blog/quick-start.html)**

# Can I see some examples?
Here are two web sites that are built using md2blog:

* [My dev blog](https://log.schemescape.com/)
* [The md2blog documentation](https://jaredkrinke.github.io/md2blog/) (which isn't a blog, so not the best example)

# Additional resources

* [FAQ](https://jaredkrinke.github.io/md2blog/posts/faq/index.html)
* [Template repository](https://github.com/jaredkrinke/md2blog-template-site) for creating your own dev blog (see [instructions](https://jaredkrinke.github.io/md2blog/quick-start.html#setup))
* [Example repository](https://github.com/jaredkrinke/log) for a real site using md2blog
* [Source code](https://github.com/jaredkrinke/md2blog) for md2blog ([MIT Licensed](https://github.com/jaredkrinke/md2blog/blob/main/LICENSE.ts))
