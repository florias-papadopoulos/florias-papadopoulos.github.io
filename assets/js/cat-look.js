/* The visitor's chosen look of the cat (localStorage "cat-look", set by the picker in assets/js/cat-picker.js),
   applied before anything is drawn: loaded without defer at the top of <body> (layouts/_default/baseof.html).
   Only the known looks are applied (the options of the picker); anything else leaves the default ginger cat. */
try {
    var l = localStorage.getItem('cat-look');
    if (['silver', 'tuxedo', 'calico', 'hacker', 'astronaut', 'winter', 'bat'].indexOf(l) >= 0) document.documentElement.dataset.cat = l;
} catch (e) {}
