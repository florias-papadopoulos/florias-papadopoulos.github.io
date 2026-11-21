/* Start a player for each story on the page (.sc-player[data-story], layouts/simple-crypto/simple-crypto.html). */
(function () {
    'use strict';
    Array.prototype.forEach.call(document.querySelectorAll('.sc-player[data-story]'), function (root) {
        var def = SC.get(root.dataset.story);
        if (def) SC.players[def.id] = SC.player(root, def);
    });
})();
