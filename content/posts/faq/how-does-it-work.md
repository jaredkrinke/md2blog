---
title: How was md2blog made?
date: 2021-10-25
---
md2blog uses the [Deno](https://deno.land/) TypeScript/JavaScript runtime and is built on top of the following open source libraries:

* [Deno standard library](https://deno.land/std)
* [Goldsmith](https://github.com/jaredkrinke/goldsmith) (an in-progress static site generator inspired by [Metalsmith](https://metalsmith.io/))
* [Marked](https://marked.js.org/) for Markdown processing
* [highlight.js](https://highlightjs.org/) for syntax highlighting
* [event_driven_html_parser](https://deno.land/x/event_driven_html_parser) for detecting broken links
* [literal_html](https://deno.land/x/literal_html) for templates
