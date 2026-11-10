/* The visitor's chosen look of the cat or dog (localStorage "cat-look", set by the pickers in assets/js/lab/cat-picker.js),
   applied before anything is drawn: loaded without defer at the top of <body> (layouts/_default/baseof.html).
   Only the known looks are applied (the options of the pickers); anything else, or no choice yet, gives the
   calico cat (the first look of the picker).
   A dog look (id starting with "dog-") also sets data-pet="dog": the site's colours turn warm (cat.css) and the
   games draw a dog instead of the cat. */
/* Only on the playful side (html[data-mode="play"], set by baseof.html on the Games and Toolbox pages): the normal
   site keeps its own colours whatever pet was chosen. */
try {
    var l = document.documentElement.dataset.mode === 'play' ? localStorage.getItem('cat-look') : null;
    if (['calico', 'hacker', 'astronaut', 'winter', 'bat', 'dog-beagle', 'dog-husky', 'dog-choco', 'dog-bat'].indexOf(l) >= 0) {
        document.documentElement.dataset.cat = l;
        if (l.indexOf('dog-') === 0) document.documentElement.dataset.pet = 'dog';
    } else if (document.documentElement.dataset.mode === 'play') document.documentElement.dataset.cat = 'calico';
} catch (e) {}
