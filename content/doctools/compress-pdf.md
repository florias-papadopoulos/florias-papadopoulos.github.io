---
title: "Compress PDF"
short: "Make a PDF smaller. The pictures shrink, the text stays sharp."
description: "Make a PDF smaller in your browser: the file is never uploaded. Three levels, from lossless to strong."
---
The PDF is opened by [MuPDF](https://mupdf.com/), a PDF engine that runs here in your browser as WebAssembly. It is downloaded from this site the first time you use the tool (about 5 MB) and then kept by your browser.

**Lossless** rewrites the file: it drops parts nothing uses, packs the rest tighter, and keeps only the letters each font really needs. Nothing you can see changes.

**Recommended** also shrinks every picture to 150 dots per inch at the largest size it appears on a page, which is still sharp on screen and in print. **Strong** goes to 96 dots per inch, which is fine on screen. Photos are saved as JPEG; screenshots, plots and logos stay lossless at their new size, so text inside them does not blur. A picture is only replaced when the new one is clearly smaller.

The text, links, bookmarks and forms of the PDF are kept as they are.
