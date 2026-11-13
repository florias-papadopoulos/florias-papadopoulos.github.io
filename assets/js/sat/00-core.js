/* The satellites page (/phd/satellites/), part 00: what the page and its worker share. Reading CelesTrak's
   CSV (OMM fields), SGP4 through satellite.js (self.SATJS, sgp4-entry.js), times, orbit facts and Hermite
   interpolation between two propagated states. Positions are TEME (close to an inertial frame), in km and km/s.
   See README.md for the parts. */
var SAT = (function () {
    'use strict';
    var L = self.SATJS;
    var RE = 6378.135;          /* Earth's equatorial radius of SGP4's WGS72 constants, km */
    var MU = 398600.8;          /* km^3/s^2, the same constants */

    /* CelesTrak's CSV: a header line, then one object per line; quoted fields are allowed in case a name has a comma */
    function parseCSV(text) {
        var lines = text.replace(/\r/g, '').split('\n'), head = null, out = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line) continue;
            var f = splitLine(line);
            if (!head) { head = f; continue; }
            if (f.length !== head.length) continue;
            var o = {};
            for (var j = 0; j < head.length; j++) o[head[j]] = f[j];
            out.push(o);
        }
        return out;
    }
    function splitLine(line) {
        if (line.indexOf('"') < 0) return line.split(',');
        var f = [], cur = '', q = false;
        for (var i = 0; i < line.length; i++) {
            var c = line[i];
            if (q) {
                if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
            } else if (c === '"') q = true;
            else if (c === ',') { f.push(cur); cur = ''; } else cur += c;
        }
        f.push(cur);
        return f;
    }

    function jd(ms) { return ms / 86400000 + 2440587.5; }

    /* the SGP4 record of one object, or null when its elements cannot be used */
    function satrec(rec) {
        try {
            var s = L.json2satrec(rec);
            return s && !s.error ? s : null;
        } catch (e) { return null; }
    }

    /* position and velocity at time ms (epoch milliseconds) into p and v at offset o; false when SGP4 fails (decayed) */
    function state(s, ms, p, v, o) {
        var r = L.sgp4(s, (jd(ms) - s.jdsatepoch) * 1440);
        if (!r || !r.position) return false;
        var a = r.position, b = r.velocity;
        if (a.x !== a.x) return false;
        p[o] = a.x; p[o + 1] = a.y; p[o + 2] = a.z;
        v[o] = b.x; v[o + 1] = b.y; v[o + 2] = b.z;
        return true;
    }

    /* the Earth's rotation angle (Greenwich sidereal time, rad) and the direction of the Sun (unit vector) */
    function gmst(ms) { return L.gstime(jd(ms)); }
    function sunDir(ms) {
        var r = L.sunPos(jd(ms)).rsun, n = Math.hypot(r[0], r[1], r[2]);
        return [r[0] / n, r[1] / n, r[2] / n];
    }
    function geodetic(p, ms) {
        var g = L.eciToGeodetic({ x: p[0], y: p[1], z: p[2] }, gmst(ms));
        return { lat: g.latitude * 180 / Math.PI, lon: g.longitude * 180 / Math.PI, alt: g.height };
    }

    /* the shape of an orbit from its mean elements: semi-major axis, perigee and apogee heights (km), period (min) */
    function orbit(rec) {
        var n = Number(rec.MEAN_MOTION) * 2 * Math.PI / 86400, e = Number(rec.ECCENTRICITY);
        var a = Math.cbrt(MU / (n * n));
        return { a: a, e: e, inc: Number(rec.INCLINATION), perigee: a * (1 - e) - RE, apogee: a * (1 + e) - RE,
            period: 1440 / Number(rec.MEAN_MOTION) };
    }
    /* the usual names: LEO below 2000 km, GEO at 35 786 km with a one-day period, MEO in between (ESA's "Types of
       orbits"); very eccentric orbits are "highly elliptical" */
    function orbitClass(o) {
        if (o.e > 0.25) return 'Highly elliptical orbit';
        if (o.apogee < 2000) return 'Low Earth orbit (LEO)';
        if (Math.abs(o.period - 1436.1) < 30 && o.e < 0.05) return o.inc < 3 ? 'Geostationary orbit (GEO)' : 'Geosynchronous orbit';
        if (o.apogee < 35000) return 'Medium Earth orbit (MEO)';
        return 'High Earth orbit';
    }

    /* cubic Hermite between two states h seconds apart, at fraction u: position into p (and velocity into v when
       given), offset o; good to well under a kilometre for LEO with h up to five minutes */
    function hermite(p0, v0, p1, v1, i, h, u, p, v, o) {
        var u2 = u * u, u3 = u2 * u;
        var a = 2 * u3 - 3 * u2 + 1, b = u3 - 2 * u2 + u, c = -2 * u3 + 3 * u2, d = u3 - u2;
        var da = (6 * u2 - 6 * u) / h, db = 3 * u2 - 4 * u + 1, dc = (-6 * u2 + 6 * u) / h, dd = 3 * u2 - 2 * u;
        for (var k = 0; k < 3; k++) {
            var x0 = p0[i + k], w0 = v0[i + k], x1 = p1[i + k], w1 = v1[i + k];
            p[o + k] = a * x0 + b * h * w0 + c * x1 + d * h * w1;
            if (v) v[o + k] = da * x0 + db * w0 + dc * x1 + dd * w1;
        }
    }

    return { RE: RE, parseCSV: parseCSV, satrec: satrec, state: state, gmst: gmst, sunDir: sunDir, geodetic: geodetic,
        orbit: orbit, orbitClass: orbitClass, hermite: hermite };
}());
