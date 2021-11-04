---
title: How was md2blog made?
date: 2021-10-25
---
md2blog is built on top of [Metalsmith](https://metalsmith.io/), an "extremely simple, pluggable static site generator", along with the following Metalsmith plugins:

* [metalsmith-broken-link-checker](https://github.com/davidxmoody/metalsmith-broken-link-checker)
* [metalsmith-collections](https://github.com/segmentio/metalsmith-collections)
* [metalsmith-discover-partials](https://github.com/timdp/metalsmith-discover-partials)
* [metalsmith-drafts](https://github.com/segmentio/metalsmith-drafts)
* [metalsmith-express](https://github.com/chiefy/metalsmith-express)
* [metalsmith-filemetadata](https://github.com/dpobel/metalsmith-filemetadata)
* [metalsmith-layouts](https://github.com/metalsmith/metalsmith-layouts)
* [metalsmith-metadata](https://github.com/segmentio/metalsmith-metadata)
* [metalsmith-rootpath](https://github.com/radiovisual/metalsmith-rootpath)
* [metalsmith-taxonomy](https://github.com/webketje/metalsmith-taxonomy)
* [metalsmith-watch](https://github.com/FWeinb/metalsmith-watch)

md2blog also uses the following libraries (unrelated to Metalsmith):

* [commander](https://www.npmjs.com/package/commander)
* [dot2svg-wasm](https://github.com/jaredkrinke/dot2svg-wasm)
* [Handlebars](https://handlebarsjs.com/)
* [highlight.js](https://highlightjs.org/)
* [JSTransformer](https://github.com/jstransformers/jstransformer)
* [Less](https://lesscss.org/)
* [Marked](https://marked.js.org/)
* [route-parser](https://github.com/rcs/route-parser)

Libraries used for testing:

* [cheerio](https://cheerio.js.org/)
* [Mocha](https://mochajs.org/)
