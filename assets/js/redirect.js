/* Old project addresses (layouts/projects/single.html): go to the entry on its tab, given in data-to; the meta
   refresh in the page does the same without JavaScript. Only addresses on this site are followed ("/..." but not
   "//..." or "/\..."), so the script can never send a visitor elsewhere, whatever the attribute says. */
(function () {
    var to = String(document.currentScript.dataset.to || '');
    if (/^\/(?![\/\\])/.test(to)) location.replace(to);
})();
