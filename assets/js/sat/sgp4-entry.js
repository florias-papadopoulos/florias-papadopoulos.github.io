/* The parts of satellite.js (vendor/satellite.js, unchanged) that the satellites page uses, bundled by Hugo (js.Build,
   layouts/phd/satellites.html) into one script that sets self.SATJS, for the page and for its worker. */
import { json2satrec } from './vendor/satellite.js/io.js';
import { sgp4 } from './vendor/satellite.js/propagation/sgp4.js';
import { gstime } from './vendor/satellite.js/propagation/gstime.js';
import { sunPos } from './vendor/satellite.js/sun.js';
import { eciToGeodetic } from './vendor/satellite.js/transforms.js';

self.SATJS = { json2satrec: json2satrec, sgp4: sgp4, gstime: gstime, sunPos: sunPos, eciToGeodetic: eciToGeodetic };
