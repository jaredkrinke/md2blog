---
title: How do I add a copyright notice to my site?
date: 2021-11-07
---
The `footer.text` property in `site.json` can be used to add a plain text copyright notice to all pages of the site:

```json
{
    ...
    "footer": {
        "text": "Copyright 2021 John Doe. All rights reserved."
    }
}
```