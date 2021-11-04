---
title: Sample page
tags: [faq]
---
# Paragraphs
Posts and pages are authored in plain text using [Markdown](https://guides.github.com/features/mastering-markdown/) (`.md` extension), with [YAML](https://en.wikipedia.org/wiki/YAML) front matter for specifying metadata (such as the date of the post).

Additionally, the produced site is "minimal, but fully functional".

# Code
HTML/JavaScript:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Monaco Editor from CDN example, with automatic resizing</title>
</head>
<body>
<h1>Monaco Editor, loaded via CDN</h1>
<div id="editor"></div>
<script>
require(["vs/editor/editor.main"], function () {
    // Create the editor with some sample JavaScript code
    var editor = monaco.editor.create(document.getElementById("editor"), {
        value: "// code goes here\n",
        language: "javascript"
    });

    // Resize the editor when the window size changes
    const editorElement = document.getElementById("editor");
    window.addEventListener("resize", () => editor.layout({
        width: editorElement.offsetWidth,
        height: editorElement.offsetHeight
    }));
});
</script>
</body>
</html>
```

C:
```c
#include <math.h>

#define WASM_EXPORT_AS(name) __attribute__((export_name(name)))
#define WASM_EXPORT(symbol) WASM_EXPORT_AS(#symbol) symbol

double WASM_EXPORT(sine)(double theta) {
    return sin(theta);
}
```

WebAssembly:
```wasm
(module
  (type (;0;) (func (param i32 i32) (result i32)))
  (import "env" "__linear_memory" (memory (;0;) 0))
  (func $add (type 0) (param i32 i32) (result i32)
    local.get 1
    local.get 0
    i32.add))
```

# Table, with code
| Field | Type | Required? | Note |
| --- | --- | --- | --- |
| `title` | string | Required | |
| `date` | YYYY-MM-DD | Required | |

# List, with code
* `content/`: Root directory that contains all source content for the site
  * `site.json`: Site-wide metadata
  * `assets/`: Directory for static assets (e.g. images)
  * `posts/`: Directory for all posts
    * `category1/`: Directory for posts related to "category1"
      * `post1.md`: Post related to "category1"
      * `post2.md`: Another "category1" post
    * `category2/`: Another category
      * `post3.md`: "category2" post
      * etc.

# Block quote
Sample block quote:

> Convert a *self-contained, organized* set of [Markdown](https://guides.github.com/features/mastering-markdown/) posts into a *minimal, but fully functional* static blog, requiring *zero configuration*.

# Diagram

```dot2svg
digraph {
    a -> b -> c;
}
```