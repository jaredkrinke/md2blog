# md2blog
Here's the purpose of md2blog:

> Convert a *self-contained, organized* set of [Markdown](https://daringfireball.net/projects/markdown/) posts into a *minimal, but fully functional* static blog, requiring *zero configuration*.

The key differentiator for md2blog is the "self-contained, organized" part. By this, I mean:

* **Relative links between Markdown files (including anchors) "just work"** (and are validated at build time)
* Source Markdown files **can be viewed (with working links and images) in any Markdown previewer** (e.g. VS Code or GitHub)
* Posts are **implicitly categorized based on directory structure** (supplemental tags are also supported)

Additionally, the produced site is "minimal, but fully functional" in the following sense:

* Page templates use **clean, semantic HTML** with only a few kilobytes of CSS (and no JavaScript)
* **Relative links are used wherever possible**, so the site can be hosted anywhere (or even **viewed directly from the file system**)
* **Syntax highlighting** is automatically added to code blocks
* An [Atom](https://validator.w3.org/feed/docs/atom.html)/RSS news feed is automatically generated

Note that "zero configuration" implies that md2blog is highly opinionated, to the point that there are no options to configure. **Instead of fiddling with options and themes, the user's focus is strictly on writing and publishing content.**

# Samples
Want to see an example? Here are two web sites built with md2blog:

* [The site you're currently reading](index.md)
* [My dev blog](https://log.schemescape.com/)

# Interested?
If md2blog sounds interesting to you (and you've got [Node and NPM](https://nodejs.org/en/download/) setup already), here are links to get you started:

* [Quick start](posts/quick-start/getting-started.md)
* [FAQ](posts/faq/list.md)
* Template repository (TODO)
* [Example repository for a real site using md2blog](https://github.com/jaredkrinke/log)
