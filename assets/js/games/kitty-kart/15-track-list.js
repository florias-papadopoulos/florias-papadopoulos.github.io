    var MAPS = [MEADOW, CITY, REEF, MOON, VOLCANO, TREES, DESERT, SKY, MUSIC, RAINBOW, ZOMBIE, ROOM];

    function drawParts(kind) {
        var any = false;
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (p.k !== kind || !vis(p.x, p.y, 20)) continue;
            var f = p.t / p.life;
            ctx.globalAlpha = 1 - f; any = true;
            if (kind === 'bub') {
                var r = p.r * (0.7 + f * 0.8);
                ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.fillRect(p.x - r * 0.45, p.y - r * 0.55, r * 0.35, r * 0.35);
            } else if (kind === 'drop') { circle(ctx, p.x, p.y, p.r, '#a9c8ff'); }
            else if (kind === 'leaf') { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.5, p.t * 6 + i, 0, 7); ctx.fill(); }
            else if (kind === 'card') { ctx.fillStyle = '#c08a4f'; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); }
            else if (kind === 'spark') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.5), p.c || '#fde047'); }
            else if (kind === 'lava') { circle(ctx, p.x, p.y, p.r * (1 - f * 0.4), f < 0.5 ? '#ffd166' : '#ff5a1f'); }
            else if (kind === 'petal') { ctx.fillStyle = '#ffb7d5'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.55, p.t * 5 + i, 0, 7); ctx.fill(); }
            else { ctx.globalAlpha = (1 - f) * 0.5; circle(ctx, p.x, p.y, p.r * (1 + f * 1.5), MAP.dustCol || '#cfd2da'); }
        }
        if (any) ctx.globalAlpha = 1;
    }

