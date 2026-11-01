/* The visitor's chosen look of the cat (localStorage "cat-look", set by the picker in assets/js/cat-picker.js),
   applied before anything is drawn: loaded without defer at the top of <body> (layouts/_default/baseof.html). */
try { var l = localStorage.getItem('cat-look'); if (l) document.documentElement.dataset.cat = l; } catch (e) {}
