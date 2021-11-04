---
title: How do I customize the theme?
date: 2021-10-31
---
Originally, I hadn't planned on making md2blog's theme customizable because theming would readily provide an irresistible distraction from authoring content (and eliminating such distractions is one of the main motivations for md2blog).

But in the end, I decided to make a concession to customization and add support for theming through the following four colors (specified in CSS color names like `cyan` or hex format, e.g. `#ffee88`):

* Title (used for the site title)
* Heading (used for top headings)
* Link (used for links)
* Comment (used only in code blocks)

All 4 colors are reused for syntax highlighting in code blocks.

To customize colors, use the `colors.title`, etc. properties in your `site.json` file (defaults values are shown):

```json
{
    "title": "My blog",
// ...
    "colors": {
        "title": "#e6b95c",
        "heading": "#d97c57",
        "link": "#d97c57",
        "comment": "#7bbf56"
    }
}
```

I suggest serving the site locally with `npx md2blog --serve` while you play with the values and watch the page automatically reload in your browser.
