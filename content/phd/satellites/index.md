---
title: "Satellites, live"
description: "A live globe of fifteen thousand satellites and pieces of debris from public orbit data, with a rough screening for close approaches."
blurb: "Fifteen thousand satellites and pieces of debris on a live globe, and which of them pass close to each other in the next hours."
lede: "Where they are right now: every object of a few public catalogues, from space stations to the fragments of two disasters."
preview: "img/phd/satellites.svg"
weight: 1
# not yet approved by the owner: shows a 🚧 next to the title everywhere (remove the line once approved)
wip: true
layout: satellites
---

## What is up there

Radars and telescopes regularly track about **47,000 objects** in Earth orbit. Only about **15,800** of them are
working satellites; the rest are dead satellites, spent rocket stages and fragments. Below the size that can be
tracked there is much more: models estimate 68,450 objects larger than 10 cm and **1.5 million** between 1 and 10 cm
([ESA, statistics of 2 November 2026][esa-stats]). The globe above shows about a third of the tracked ones.

## Three kinds of orbit

Most objects fly in **low Earth orbit**, below 2,000 km, where one turn takes about an hour and a half: the dense
shell close to the surface. Navigation satellites (GPS, Galileo) fly at about 20,000 km, in **medium Earth orbit**,
and need about half a day per orbit. **Geostationary** satellites, at 35,786 km, take one sidereal day, so they stay
above one spot of the equator: the far ring ([ESA, types of orbits][esa-orbits]; [GPS.gov][gps]). Speed the clock
up to 3600&times; to see the difference.

## Debris, and the Kessler syndrome

In 1978 Donald Kessler and Burton Cour-Palais warned that once enough objects are in orbit, collisions make
fragments faster than the atmosphere removes them, and the debris keeps growing by itself
([Kessler and Cour-Palais, 1978][kessler]). Two events alone left thousands of tracked fragments; the 2,700 still in
orbit in November 2026 are on the globe. China destroyed its weather satellite Fengyun-1C with a missile on 11 January 2007,
and on 10 February 2009 the working Iridium 33 and the dead Cosmos 2251 collided, the first accidental collision of
two whole satellites ([NASA ODPO, 2007][odqn-2007]; [2009][odqn-2009]). ESA's latest report finds that even with
no new launches, the debris population would keep growing ([ESA Space Environment Report 2026][esa-ser]).

## How collisions are avoided

Surveillance networks, such as the US Space Surveillance Network, compare the orbits of all catalogued objects and
send operators **conjunction data messages**: who comes close to whom, when, and how uncertain that is. A satellite in
low orbit gets hundreds of alerts a week; most are dismissed, and when the probability of a collision is above
typically 1 in 10,000, the operator moves the satellite ([ESA, 2019][esa-cam]; [NASA CARA][cara]). ESA needs more
than one avoidance manoeuvre per satellite per year. The International Space Station had made 41 since 1999
([NASA ODPO, September 2025][odqn-2025]), and SpaceX reported 207,152 for its Starlink satellites in the six months
from December 2025 to May 2026 ([Space.com, July 2026][starlink]).

<p class="sat-credits"><strong>Sources and credits.</strong> Orbits: <a href="https://celestrak.org/NORAD/elements/">CelesTrak</a> GP data (from the US Space Force's public catalogue), copied to this site once a day. Propagation: <a href="https://github.com/shashwatak/satellite-js">satellite.js</a> 7.1.0 (MIT licence), an implementation of SGP4. Earth: NASA's <a href="https://visibleearth.nasa.gov/images/57752/blue-marble-land-surface-shallow-water-and-shaded-topography">Blue Marble</a> (Reto St&ouml;ckli, NASA Goddard; public domain). The globe is drawn with WebGL, by this page's own code; nothing is loaded from other sites.</p>

[esa-stats]: https://sdup.esoc.esa.int/discosweb/statistics/
[esa-orbits]: https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits
[gps]: https://www.gps.gov/space-segment
[kessler]: https://doi.org/10.1029/JA083iA06p02637
[odqn-2007]: https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv11i2.pdf
[odqn-2009]: https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/odqnv13i2.pdf
[esa-ser]: https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2026
[esa-cam]: https://www.esa.int/Space_Safety/Space_Debris/Automating_collision_avoidance
[cara]: https://www.nasa.gov/cara/step-2-close-approach-risk-assessment
[odqn-2025]: https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/ODQNv29i3.pdf
[starlink]: https://www.space.com/space-exploration/satellites/every-spacex-starlink-satellite-has-to-dodge-a-collision-almost-weekly-and-experts-fear-the-worst
