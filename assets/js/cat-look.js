/* The visitor's chosen look of the cat or dog (localStorage "cat-look", set by the pickers in assets/js/cat-picker.js),
   applied before anything is drawn: loaded without defer at the top of <body> (layouts/_default/baseof.html).
   Only the known looks are applied (the options of the pickers); anything else leaves the default ginger cat.
   A dog look (id starting with "dog-") also sets data-pet="dog": the site's colours turn warm (cat.css) and the
   games draw a dog instead of the cat. */
/* Only on the playful side (html[data-mode="play"], set by baseof.html on the Games and Toolbox pages): the normal
   site keeps its own colours whatever pet was chosen. */
try {
    var l = document.documentElement.dataset.mode === 'play' ? localStorage.getItem('cat-look') : null;
    if (['calico', 'hacker', 'astronaut', 'winter', 'bat', 'dino', 'dog-beagle', 'dog-husky', 'dog-choco', 'dog-bat', 'dog-dino'].indexOf(l) >= 0) {
        document.documentElement.dataset.cat = l;
        if (l.indexOf('dog-') === 0) document.documentElement.dataset.pet = 'dog';
    }
} catch (e) {}
