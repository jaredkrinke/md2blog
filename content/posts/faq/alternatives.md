---
title: Why not just use X instead?
date: 2021-11-01
---
There are [hundreds of static site generators](https://jamstack.org/generators/). Why make yet another?

The short answer is that none of the [static site generators I tested out](https://log.schemescape.com/posts/static-site-generators/comparison.html) did what I wanted out of the box (or required too much setup).

The most common issues were:

* No support for relative links between Markdown files (that get translated to corresponding HTML files at build time)
* No support for implicit categorization
* Unintuitive template languages
* Requiring installing new language runtimes

Here are some specific notes on popular SSGs:

# Jekyll
[Jekyll](https://jekyllrb.com/) is probably the closest to what I was looking for, but I had no interest in setting up a Ruby environment or learning about the language (in case I needed to author my own plugins). I also didn't like the verbose syntax of the [Liquid](https://shopify.github.io/liquid/) template language.

# Hugo
Given that [Hugo](https://gohugo.io/) is broadly used and ships in a single binary, I thought I would end up using Hugo, but it was too general, and I wanted something with out-of-the-box support for a dev blog. Hugo's template language was also the most unintuitive template language I've ever seen.

# Pelican
[Pelican](https://blog.getpelican.com/) sounds like "Jekyll in Python", but I honestly didn't seriously consider it because I've had so many compatibility issues with Python in the past, that I generally try to avoid Python entirely. I realize I'm in the minority on this, but any language that practically requires virtual environments due to breaking changes seems too fragile for my delicate constitution.

# Eleventy
I actually started out using [Eleventy](https://www.11ty.dev/) because it was very simple and easy to understand, but I ended up preferring [Metalsmith](https://metalsmith.io/) (on which md2blog is now built) because Metalsmith was *even simpler*, to the point that I could easily understand everything it was doing, instead of having to guess.

# Gatsby
I hate [Gatsby](https://www.gatsbyjs.com/), and pretty much any other "static" site generator that runs a bunch of client JavaScript to hopefully speed up subsequent page loads. Maybe I'm being unreasonable, but I want a static site generator to spit out HTML, not a web app.

# Hexo
[Hexo](https://hexo.io/) sounds like it might be a great static site generator, but by the time I gave it a serious look, I was already building on Eleventy (and later Metalsmith), so I didn't investigate Hexo further. I realize this isn't a great reason for not exploring Hexo, but it's the honest truth.
