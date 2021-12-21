---
title: What sort of SEO does md2blog do?
date: 2021-11-02
---
md2blog's search engine optimization efforts are mostly around creating simple pages with accurate metadata:

* URLs contain the post category (parent directory name)
* `description` property is added to a "description" meta tag
* `keywords` are added to the "keywords" meta tag
* [JSON-LD ](https://json-ld.org/) is mapped as in the following table:

| JSON-LD property | Post YAML front matter property |
| --- | --- |
| `@context` | `"https://schema.org"` |
| `@type` | `"BlogPosting"` |
| `headline` | `title` |
| `abstract` | `description` (if present) |
| `keywords` | Category (parent directory) + `keywords` |
| `datePublished` | `date` |
