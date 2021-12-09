---
title: Quick start
---
# Setup
## Install md2blog
### Option A: pre-built executable
First, download the appropriate zip file for your platform from the [md2blog releases page](https://github.com/jaredkrinke/md2blog/releases). Then unzip the binary, and place it somewhere convenient (e.g. somewhere in `PATH`).

### Option B: install script using Deno
Alternatively, and *only if you have [Deno](https://deno.land/) and are familiar with it*, install the md2blog script (with desired [permissions](posts/faq/permissions.md)) using `deno install`:

```txt
deno install --allow-read --allow-write --allow-net=localhost https://deno.land/x/md2blog/main.ts
```

## Create site from template
After ensuring you can run md2blog (e.g. with `md2blog --help`), it's time to create your site (if md2blog doesn't run, check the [FAQ for likely problems](posts/faq/common-problems.md)).

You can start from scratch (using the information on the rest of this page) or continue reading this section to learn how to use the [md2blog-template-site repository](https://github.com/jaredkrinke/md2blog-template-site).

[Download the zip file](https://github.com/jaredkrinke/md2blog-template-site/archive/refs/heads/main.zip) of the template and extract the files somewhere.

## Customize the site
The [directory structure for the template site](#directory-structure) is explained later.

Here are some recommended first steps:

1. Update `content/site.json` and edit the `title`, `description`, and `footer.text` properties (and optionally add a `url` property)
1. Create directories under `content/posts/` for categories
1. Create posts as `*.md` Markdown files under the category directories, e.g. `content/posts/misc/first-post.md` (see [below](#front-matter) for the metadata format)

## Build and view the site
To build and test the site locally (with automatic reloading), run:

```txt
md2blog --clean --serve
```

And open a browser to the "localhost" URL that is written to the console. You can kill the server with Ctrl+C.

More details on [building and testing locally](#building-and-testing-locally) are below.

## Read on for more information
The rest of this page contains more detailed information on how to use md2blog. Feel free to skim it or just use it for reference, as needed.

Additional resources:
* [FAQ](posts/faq/index.html)
* [md2blog discussion board](https://github.com/jaredkrinke/md2blog/discussions)

# Concepts
md2blog reads input from a single **input directory** (`content/`, by default) and writes a static site to an **output directory** (`out/`, by default).

The input directory contains **site metadata**, **posts**, **pages**, and **static assets**:

* **Site metadata** is information about the site (e.g. title and root URL, stored in `site.json`)
* **Posts** represent individual articles (stored under `posts/<category>/<post>.md`)
* **Pages** are just arbitrary pages on the site (e.g. `quick-start.md`)
* **Static assets** are non-Markdown files that are copied verbatim to the output directory (e.g. images)

Posts and pages are authored in plain text using [Markdown](https://guides.github.com/features/mastering-markdown/) (`.md` extension), with [YAML](https://en.wikipedia.org/wiki/YAML) front matter for specifying metadata (such as the date of the post).

# Directory structure
* `content/`: Root directory that contains all source content for the site
  * `site.json`: Site-wide metadata (required)
  * `assets/`: Directory for static assets such as images (optional)
  * `posts/`: Directory for all posts (required)
    * `category1/`: Directory for posts related to "category1"
      * `post1.md`: Post related to "category1"
      * `post2.md`: Another "category1" post
    * `category2/`: Another category
      * `post3.md`: "category2" post
      * etc.

# Example content
See the [template repository](https://github.com/jaredkrinke/md2blog-template-site) for a complete example.

## site.json
Here's an example `site.json` file:

```json
{
    "$schema": "https://raw.githubusercontent.com/jaredkrinke/md2blog/main/schema/site.schema.json",
    "title": "My dev blog",
    "url": "https://mydevblog.com/",
    "description": "A very good dev blog indeed",
    "footer": {
        "text": "Optional copyright notice goes here"
    }
}
```

Note that the (optional) `$schema` property is not used by md2blog, but is instead used by some editors (e.g. VS Code) to support contextual hints and auto-complete based on the [site.json JSON schema](https://raw.githubusercontent.com/jaredkrinke/md2blog/main/schema/site.schema.json).

Schema (official link [here](https://raw.githubusercontent.com/jaredkrinke/md2blog/main/schema/site.schema.json)):

| Field | Type | Required? | Note |
| --- | --- | --- | --- |
| `title` | string | Required | |
| `url` | string | Recommended | |
| `description` | string | Optional | Used in meta tag and as the default subtitle |
| `colors` | object | Optional | See [theme FAQ](posts/faq/themes.md) for details |
| `header.text` | string | Optional | Overrides the default subtitle |
| `header.links` | object | Optional | Site-wide navigation links ([more details here](posts/faq/additional-links.md)) |
| `footer.text` | string | Optional | Footer text added to all pages of the site (recommended for [adding a copyright notice](posts/faq/copyright-notice.md)) |

Note that the site *will* generally work without specifying a URL, but the Atom feed may not work in all feed readers because it will be forced to use relative links instead of absolute URLs.

## Posts
Posts are written in [Markdown](https://guides.github.com/features/mastering-markdown/) and use [YAML](https://en.wikipedia.org/wiki/YAML) for front matter (fenced above and below by three hyphens: `---`).

### Front matter
Here's an example showing all of the supported YAML front matter properties (`title` and `date` are required):

```yaml
---
title: First post
date: 2021-10-26
description: First post on my blog, with a relative link.
keywords: [additional-tag]
draft: true
---
(Markdown content follows...)
```

Schema:

| Field | Type | Required? | Note |
| --- | --- | --- | --- |
| `title` | string | Required | |
| `date` | YYYY-MM-DD | Required | Format: YYYY-MM-DD |
| `description` | string | Optional | This text is displayed on index pages |
| `keywords` | string[] | Optional | Additional tags for categorizing the post |
| `draft` | Boolean | Optional | If `true`, the post will only be built if `--drafts` was specified on the command line |

### Content
Here's example Markdown content, demonstrating relative links (these links get translated to the corresponding HTML files and the links are checked at build time; they also work in the VS Code and GitHub Markdown previewers):

```markdown
# Relative links
Here's a relative link to another post in this category: [link](post2.md)!

And here's one to another category, with an anchor: [link 2](../category2/post3.md#some-section).

# Image
Here's an image:
![test](../../assets/test.png)
```

Finally, here is an example of a code block (specifying the language is recommended, but optional):

````markdown
# Code block
Here's some code:

```javascript
const add = (a, b) => a + b;
```
````

# Building and testing locally
To build the site locally, use the following command (note: `--clean` is optional):

```sh
md2blog --clean
```

The file will be written to the `out/` directory.

To test the site, simply open `out/index.html` directly from the file system.

## Local web server with automatic reloading
You can also test using a local web server that will automatically regenerate and reload pages when you save content files to disk using this command:

```sh
md2blog --serve
```

## Command line options
For more details on command line options, see [this FAQ entry](posts/faq/command-line.md).

# Publishing
md2blog doesn't have any built-in support for publishing sites, but all that's required is copying everything from `out/` to your web root.

## Publishing to GitHub pages
If you're planning to publish to [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages), here's an example:

1. Build your site with `md2blog --clean`
1. Initialize Git in `out/` and upload for the first time:

```sh
cd out
git init .
git checkout -B web
git remote add origin <your remote repository>
git add .
git commit -m "Upload site"
git push -u origin web
cd ..
```

To update your site in the future:

```sh
md2blog --clean
cd out
git add .
git commit -m "Update site"
git push
cd ..
```

Finally, set up GitHub Pages on your repository to publish from the appropriate branch/directory (the "web" branch, in this example).

Note that if you want to use a custom domain, just follow [GitHub's custom domain directions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) and then plop your `CNAME` file in the `content/` directory prior to building your site.

# Now go build your dev blog!
That's all there is to md2blog. There's no need to worry about themes or plugins. Just start writing!

If you have additional questions, consult the [FAQ](posts/faq/index.html). If you don't see an answer there, feel free to post in the [md2blog discussion board](https://github.com/jaredkrinke/md2blog/discussions) (or [report an issue](https://github.com/jaredkrinke/md2blog/issues), if something is broken).
