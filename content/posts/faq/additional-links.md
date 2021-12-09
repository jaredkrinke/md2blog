---
title: How do I add navigation links (e.g. to projects or social media profiles)?
date: 2021-11-04
---
md2blog supports adding additional links to the site header (for an example, see the "Home", "Quick Start", and "FAQ" links at the top of this page).

Links are specified on the `header.links` property in `site.json`. This property is an object where the keys are the link labels, and the values are the links (relative paths from the site root or absolute URLs).

Note that relative links to source Markdown files are automatically translated to point to the output HTML files.

Example:

```json
{
    "title": "md2blog",
    "description": "A zero-config static site generator for dev blogs",
    "header": {
        "links": {
            "Home": "index.html",
            "Quick Start": "quick-start.md",
            "FAQ": "posts/faq/index.html"
        }
    }
}
```

Here are some common links to automatically generated resources:

| Link | Description |
| --- | --- |
| `index.html` | Home page |
| `posts/index.html` | Post archive page |
| `posts/category1/index.html` | Tag index page for tag `category1` |
| `feed.xml` | Atom feed |
