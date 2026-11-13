/* The satellites page, part 10: the globe, drawn with plain WebGL 1 (no library). The scene is in Earth radii, in
   the same inertial frame as SGP4's positions (TEME); the Earth turns in it by the sidereal angle, lit by the Sun.
   One points buffer for all objects (hidden ones get alpha 0), thick lines for orbits, rings for picked objects.
   The camera circles the centre: drag turns it, a wheel or two fingers zoom. */
var GLOBE = (function () {
    'use strict';

    var VS_EARTH = 'attribute vec3 aPos;attribute vec2 aUV;uniform mat4 uVP;uniform float uRot;varying vec2 vUV;varying vec3 vN;' +
        'void main(){float c=cos(uRot),s=sin(uRot);vec3 p=vec3(c*aPos.x-s*aPos.y,s*aPos.x+c*aPos.y,aPos.z);vN=p;vUV=aUV;gl_Position=uVP*vec4(p,1.0);}';
    var FS_EARTH = 'precision mediump float;uniform sampler2D uTex;uniform float uHasTex;uniform vec3 uSun;varying vec2 vUV;varying vec3 vN;' +
        'void main(){vec3 col=mix(vec3(0.16,0.27,0.42),texture2D(uTex,vUV).rgb,uHasTex);' +
        'float d=dot(normalize(vN),uSun);float l=0.42+0.58*smoothstep(-0.12,0.18,d);gl_FragColor=vec4(col*l,1.0);}';
    var VS_PTS = 'attribute vec3 aPos;attribute vec4 aCol;uniform mat4 uVP;uniform float uSize;varying vec4 vCol;' +
        'void main(){gl_Position=uVP*vec4(aPos,1.0);gl_PointSize=aCol.a>0.0?uSize:0.0;vCol=aCol;}';
    var FS_PTS = 'precision mediump float;uniform float uRing;varying vec4 vCol;' +
        'void main(){float r=length(gl_PointCoord-0.5);if(r>0.5||vCol.a<=0.0)discard;' +
        'float a=uRing>0.5?smoothstep(0.26,0.33,r)*(1.0-smoothstep(0.43,0.5,r)):1.0-smoothstep(0.32,0.5,r);' +
        'if(a<=0.01)discard;gl_FragColor=vec4(vCol.rgb,vCol.a*a);}';
    var VS_LINE = 'attribute vec3 aA;attribute vec3 aB;attribute float aSide;uniform mat4 uVP;uniform vec2 uHalf;uniform float uWidth;' +
        'void main(){vec4 a=uVP*vec4(aA,1.0);vec4 b=uVP*vec4(aB,1.0);vec2 d=b.xy/b.w*uHalf-a.xy/a.w*uHalf;' +
        'vec2 n=length(d)>0.0001?normalize(vec2(-d.y,d.x)):vec2(0.0);a.xy+=n*aSide*uWidth/uHalf*a.w;gl_Position=a;}';
    var FS_LINE = 'precision mediump float;uniform vec4 uCol;void main(){gl_FragColor=uCol;}';

    function compile(gl, vs, fs) {
        var p = gl.createProgram();
        [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (x) {
            var s = gl.createShader(x[0]);
            gl.shaderSource(s, x[1]);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
            gl.attachShader(p, s);
        });
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        var loc = { p: p };
        var n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES), i, a;
        for (i = 0; i < n; i++) { a = gl.getActiveAttrib(p, i).name; loc[a] = gl.getAttribLocation(p, a); }
        n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (i = 0; i < n; i++) { a = gl.getActiveUniform(p, i).name; loc[a] = gl.getUniformLocation(p, a); }
        return loc;
    }

    /* the sphere: a grid of latitude and longitude (Earth-fixed), with the picture's coordinates */
    function sphere(nLon, nLat) {
        var pos = [], uv = [], idx = [];
        for (var j = 0; j <= nLat; j++) {
            var lat = Math.PI / 2 - j * Math.PI / nLat;
            for (var i = 0; i <= nLon; i++) {
                var lon = -Math.PI + i * 2 * Math.PI / nLon;
                pos.push(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
                uv.push(i / nLon, j / nLat);
            }
        }
        for (j = 0; j < nLat; j++) {
            for (i = 0; i < nLon; i++) {
                var a = j * (nLon + 1) + i, b = a + nLon + 1;
                idx.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }
        return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Uint16Array(idx) };
    }

    /* 4x4 matrices, column-major as WebGL wants them */
    function perspective(fovy, aspect, near, far) {
        var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
        return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
    }
    function lookAt(e, up) {
        var z = norm([e[0], e[1], e[2]]), x = norm(cross(up, z)), y = cross(z, x);
        return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
            -dot(x, e), -dot(y, e), -dot(z, e), 1];
    }
    function mul(a, b) {
        var o = new Array(16);
        for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
            o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
        }
        return o;
    }
    function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

    function create(canvas) {
        var gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false }) ||
            canvas.getContext('experimental-webgl');
        if (!gl) return null;
        var earthP = compile(gl, VS_EARTH, FS_EARTH), ptsP = compile(gl, VS_PTS, FS_PTS), lineP = compile(gl, VS_LINE, FS_LINE);
        var sph = sphere(96, 48);
        var bPos = buf(gl.ARRAY_BUFFER, sph.pos), bUV = buf(gl.ARRAY_BUFFER, sph.uv), bIdx = buf(gl.ELEMENT_ARRAY_BUFFER, sph.idx);
        var tex = gl.createTexture(), hasTex = 0;
        var pts = { pos: gl.createBuffer(), col: gl.createBuffer(), n: 0 };
        var marks = { pos: gl.createBuffer(), col: gl.createBuffer(), n: 0, size: [] };
        var lines = [];
        var cam = { lon: 0, lat: 0.35, dist: 9, min: 1.25, max: 40 };
        var rot = 0, sun = [1, 0, 0], vp = null, eye = null, W = 1, Hh = 1, dpr = 1;
        var api = { cam: cam, gl: gl, dirty: true };

        function buf(type, data) {
            var b = gl.createBuffer();
            gl.bindBuffer(type, b);
            gl.bufferData(type, data, gl.STATIC_DRAW);
            return b;
        }

        api.setEarthImage = function (img) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            hasTex = 1;
            api.dirty = true;
        };
        /* all objects: positions (Float32Array, 3 per object, Earth radii) and colours (Uint8Array, 4 per object) */
        api.setPoints = function (pos, col, n) {
            pts.n = n;
            gl.bindBuffer(gl.ARRAY_BUFFER, pts.pos);
            gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, pts.col);
            gl.bufferData(gl.ARRAY_BUFFER, col, gl.DYNAMIC_DRAW);
            api.dirty = true;
        };
        api.updatePositions = function (pos) {
            gl.bindBuffer(gl.ARRAY_BUFFER, pts.pos);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
            api.dirty = true;
        };
        api.updateColors = function (col) {
            gl.bindBuffer(gl.ARRAY_BUFFER, pts.col);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, col);
            api.dirty = true;
        };
        /* rings around picked objects and the point of closest approach: [{ p: [x, y, z], c: [r, g, b], size }] */
        api.setMarkers = function (list) {
            var p = new Float32Array(list.length * 3), c = new Uint8Array(list.length * 4);
            list.forEach(function (m, i) {
                p.set(m.p, 3 * i);
                c.set([m.c[0], m.c[1], m.c[2], 255], 4 * i);
            });
            marks.n = list.length;
            marks.size = list.map(function (m) { return m.size || 18; });
            gl.bindBuffer(gl.ARRAY_BUFFER, marks.pos);
            gl.bufferData(gl.ARRAY_BUFFER, p, gl.DYNAMIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, marks.col);
            gl.bufferData(gl.ARRAY_BUFFER, c, gl.DYNAMIC_DRAW);
            api.dirty = true;
        };
        /* orbits: [{ pts: Float32Array (3 per point, Earth radii), c: [r, g, b, a] }], drawn as thick lines */
        api.setLines = function (list) {
            lines.forEach(function (l) { gl.deleteBuffer(l.b); });
            lines = list.map(function (l) {
                var n = l.pts.length / 3 - 1, d = new Float32Array(n * 6 * 7), o = 0;
                var put = function (i, j, s) {
                    d[o++] = l.pts[3 * i]; d[o++] = l.pts[3 * i + 1]; d[o++] = l.pts[3 * i + 2];
                    d[o++] = l.pts[3 * j]; d[o++] = l.pts[3 * j + 1]; d[o++] = l.pts[3 * j + 2];
                    d[o++] = s;
                };
                for (var i = 0; i < n; i++) {
                    put(i, i + 1, 1); put(i, i + 1, -1); put(i + 1, i, 1);
                    put(i, i + 1, 1); put(i + 1, i, 1); put(i + 1, i, -1);
                }
                return { b: buf(gl.ARRAY_BUFFER, d), n: n * 6, c: l.c };
            });
            api.dirty = true;
        };
        api.setTime = function (gmst, sunDir) { rot = gmst; sun = sunDir; api.dirty = true; };

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
            if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; api.dirty = true; }
            W = w; Hh = h;
        }
        function matrices() {
            var cl = Math.cos(cam.lat);
            eye = [cam.dist * cl * Math.cos(cam.lon), cam.dist * cl * Math.sin(cam.lon), cam.dist * Math.sin(cam.lat)];
            vp = mul(perspective(0.6, W / Hh, Math.max(0.05, cam.dist - 8), cam.dist + 60), lookAt(eye, [0, 0, 1]));
        }

        api.render = function (bg) {
            resize();
            matrices();
            gl.viewport(0, 0, W, Hh);
            gl.clearColor(bg[0], bg[1], bg[2], 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            gl.depthMask(true);
            gl.disable(gl.BLEND);
            /* the Earth */
            gl.useProgram(earthP.p);
            gl.uniformMatrix4fv(earthP.uVP, false, vp);
            gl.uniform1f(earthP.uRot, rot);
            gl.uniform3fv(earthP.uSun, sun);
            gl.uniform1f(earthP.uHasTex, hasTex);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.uniform1i(earthP.uTex, 0);
            attr(earthP.aPos, bPos, 3, gl.FLOAT, false);
            attr(earthP.aUV, bUV, 2, gl.FLOAT, false);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bIdx);
            gl.drawElements(gl.TRIANGLES, sph.idx.length, gl.UNSIGNED_SHORT, 0);
            gl.disableVertexAttribArray(earthP.aUV);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.depthMask(false);
            /* orbits */
            gl.useProgram(lineP.p);
            gl.uniformMatrix4fv(lineP.uVP, false, vp);
            gl.uniform2f(lineP.uHalf, W / 2, Hh / 2);
            gl.uniform1f(lineP.uWidth, 1.1 * dpr);
            lines.forEach(function (l) {
                gl.uniform4fv(lineP.uCol, l.c);
                gl.bindBuffer(gl.ARRAY_BUFFER, l.b);
                gl.enableVertexAttribArray(lineP.aA); gl.vertexAttribPointer(lineP.aA, 3, gl.FLOAT, false, 28, 0);
                gl.enableVertexAttribArray(lineP.aB); gl.vertexAttribPointer(lineP.aB, 3, gl.FLOAT, false, 28, 12);
                gl.enableVertexAttribArray(lineP.aSide); gl.vertexAttribPointer(lineP.aSide, 1, gl.FLOAT, false, 28, 24);
                gl.drawArrays(gl.TRIANGLES, 0, l.n);
            });
            [lineP.aA, lineP.aB, lineP.aSide].forEach(function (a) { gl.disableVertexAttribArray(a); });
            /* the objects, then the rings */
            gl.useProgram(ptsP.p);
            gl.uniformMatrix4fv(ptsP.uVP, false, vp);
            if (pts.n) {
                gl.uniform1f(ptsP.uSize, api.pointSize() * dpr);
                gl.uniform1f(ptsP.uRing, 0);
                attr(ptsP.aPos, pts.pos, 3, gl.FLOAT, false);
                attr(ptsP.aCol, pts.col, 4, gl.UNSIGNED_BYTE, true);
                gl.drawArrays(gl.POINTS, 0, pts.n);
            }
            if (marks.n) {
                gl.disable(gl.DEPTH_TEST);
                gl.uniform1f(ptsP.uRing, 1);
                attr(ptsP.aPos, marks.pos, 3, gl.FLOAT, false);
                attr(ptsP.aCol, marks.col, 4, gl.UNSIGNED_BYTE, true);
                for (var i = 0; i < marks.n; i++) {
                    gl.uniform1f(ptsP.uSize, marks.size[i] * dpr);
                    gl.drawArrays(gl.POINTS, i, 1);
                }
            }
            gl.disableVertexAttribArray(ptsP.aCol);
            api.dirty = false;
        };
        function attr(loc, b, size, type, normalized) {
            gl.bindBuffer(gl.ARRAY_BUFFER, b);
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, type, normalized, 0, 0);
        }
        /* dots a little larger when zoomed in */
        api.pointSize = function () { return Math.max(2, Math.min(4.5, 2 + 6 / cam.dist)); };

        /* screen position (CSS pixels) of a scene point, or null when it is behind the Earth or the camera */
        api.project = function (x, y, z) {
            if (!vp) { resize(); matrices(); }
            var cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12], cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
            var cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
            if (cw <= 0) return null;
            /* hidden when the line from the eye to the point passes through the Earth */
            var dx = x - eye[0], dy = y - eye[1], dz = z - eye[2], dd = dx * dx + dy * dy + dz * dz;
            var t = -(eye[0] * dx + eye[1] * dy + eye[2] * dz) / dd;
            if (t > 0 && t < 1) {
                var qx = eye[0] + t * dx, qy = eye[1] + t * dy, qz = eye[2] + t * dz;
                if (qx * qx + qy * qy + qz * qz < 1) return null;
            }
            return [(cx / cw + 1) / 2 * canvas.clientWidth, (1 - cy / cw) / 2 * canvas.clientHeight];
        };
        /* the nearest visible object to a tap: pos (3 per object), shown(i) says whether it is drawn */
        api.pick = function (sx, sy, pos, n, shown, radius) {
            var best = -1, bd = radius * radius;
            for (var i = 0; i < n; i++) {
                if (!shown(i)) continue;
                var s = api.project(pos[3 * i], pos[3 * i + 1], pos[3 * i + 2]);
                if (!s) continue;
                var d = (s[0] - sx) * (s[0] - sx) + (s[1] - sy) * (s[1] - sy);
                if (d < bd) { bd = d; best = i; }
            }
            return best;
        };
        api.lookAt = function (p, dist) {
            var r = Math.hypot(p[0], p[1], p[2]);
            cam.lon = Math.atan2(p[1], p[0]);
            cam.lat = Math.asin(p[2] / r);
            if (dist) cam.dist = Math.max(cam.min, Math.min(cam.max, dist));
            api.dirty = true;
        };

        /* drag to turn, wheel or pinch to zoom; a tap (little movement) calls api.onTap(x, y) */
        var ptrs = new Map(), start = null, pinch = 0, moved = 0;
        canvas.addEventListener('pointerdown', function (e) {
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* a pointer that is already gone */ }
            ptrs.set(e.pointerId, [e.clientX, e.clientY]);
            if (ptrs.size === 1) { start = [e.clientX, e.clientY]; moved = 0; }
            if (ptrs.size === 2) pinch = spread();
        });
        canvas.addEventListener('pointermove', function (e) {
            var p = ptrs.get(e.pointerId);
            if (!p) return;
            var dx = e.clientX - p[0], dy = e.clientY - p[1];
            ptrs.set(e.pointerId, [e.clientX, e.clientY]);
            if (ptrs.size === 1) {
                moved += Math.abs(dx) + Math.abs(dy);
                var k = 2.4 / Math.max(canvas.clientHeight, 200) * Math.min(1, cam.dist / 4);
                cam.lon -= dx * k;
                cam.lat = Math.max(-1.45, Math.min(1.45, cam.lat + dy * k));
                api.dirty = true;
            } else if (ptrs.size === 2) {
                var s = spread();
                if (pinch > 0 && s > 0) zoom(pinch / s);
                pinch = s;
                moved += 100;
            }
        });
        var up = function (e) {
            if (!ptrs.has(e.pointerId)) return;
            ptrs.delete(e.pointerId);
            if (ptrs.size === 0 && moved < 8 && e.type === 'pointerup' && api.onTap) {
                var r = canvas.getBoundingClientRect();
                api.onTap(e.clientX - r.left, e.clientY - r.top, e.pointerType);
            }
            if (ptrs.size < 2) pinch = 0;
        };
        canvas.addEventListener('pointerup', up);
        canvas.addEventListener('pointercancel', up);
        canvas.addEventListener('wheel', function (e) {
            e.preventDefault();
            zoom(Math.exp(e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
        }, { passive: false });
        function spread() {
            var a = Array.from(ptrs.values());
            return a.length < 2 ? 0 : Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        }
        function zoom(f) {
            cam.dist = Math.max(cam.min, Math.min(cam.max, 1 + (cam.dist - 1) * f));
            api.dirty = true;
        }
        api.zoom = zoom;
        return api;
    }

    return { create: create };
}());
