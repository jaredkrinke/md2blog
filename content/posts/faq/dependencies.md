---
title: What's with all the dependencies?
date: 2021-10-21
---
md2blog is built on the Node/NPM ecosystem, which tends to have enormous dependency trees, partially because there isn't a single standard library (but also because there's pressure to never "reinvent the wheel" and instead use tiny packages for everything).

Honestly, I'm not a fan of huge dependency trees, for a variety of reasons (security, first and foremost), so if there's interest in md2blog, I can try and whittle down the dependency list. I'm only putting up with the current setup because it made development quick and easy for me.
