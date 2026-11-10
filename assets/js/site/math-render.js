/* KaTeX (layouts/partials/math.html): render the page's math once, with the site's delimiters. Deferred after
   static/katex/contrib/auto-render.min.js, so it runs when the page is parsed and renderMathInElement exists. */
renderMathInElement(document.body, {
    delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: "\\begin{equation}", right: "\\end{equation}", display: true},
        {left: "\\begin{equation*}", right: "\\end{equation*}", display: true},
        {left: "\\begin{align}", right: "\\end{align}", display: true},
        {left: "\\begin{align*}", right: "\\end{align*}", display: true},
        {left: "\\begin{alignat}", right: "\\end{alignat}", display: true},
        {left: "\\begin{gather}", right: "\\end{gather}", display: true},
        {left: "\\begin{CD}", right: "\\end{CD}", display: true},
    ],
    throwOnError : false
});
