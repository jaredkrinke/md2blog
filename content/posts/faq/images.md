---
title: Are there guidelines for using images?
date: 2021-10-30
---
Here are some notes and recommendations on using images within md2blog posts:

# Directory structure
It's recommended that images (and other assets) be placed in an `assets/` directory in the content root, but this is not a requirement.

Non-Markdown files (including all images) are simply copied from the input directory to the output directory, so images can be stored anywhere that is convenient.

# Image sizes and formats
md2blog currently does not process images and CSS is used to scale images to fit within the content area, so there are no strict requirements for images.

Recommendations:

* Use a **width of 1280** for large images (the default layout is 640 pixels wide and high resolution screens use a scale factor of 2x)
* Use JPEG and PNG (and, if needed, GIF) formats (because they are the most widely supported)

# Image syntax
Here's an example of Markdown's image syntax (used from `posts/category/sample.md`, referencing `assets/image.png`):

```markdown
![description](../../assets/image.png)
```

## Image links
Links and images can be composed to support image links (e.g. you could have a 1280x768 image for displaying inline that links to a very high resolution version of the image):

```markdown
[![description](../../assets/lo-res.jpg)](../../assets/hi-res.jpg)
```

## Customizing `<img>` tags
md2blog uses [Marked](https://marked.js.org/) for Markdown processing and Marked does not support adding additional attributes (e.g. width and height) to images. Instead, inline HTML can be used.
