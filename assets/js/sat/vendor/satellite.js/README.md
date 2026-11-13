# Vendored: satellite.js 7.1.0

SGP4/SDP4 propagation by Shashwat Kandadai and contributors (<https://github.com/shashwatak/satellite-js>), from the
npm package [satellite.js](https://www.npmjs.com/package/satellite.js) version 7.1.0
(<https://registry.npmjs.org/satellite.js/-/satellite.js-7.1.0.tgz>). Licence: MIT, see `LICENSE.md` here.

Only the files of the package's `dist/` that the satellites page needs are copied, unchanged: `constants.js`,
`ext.js`, `io.js`, `sun.js`, `transforms.js` and `propagation/` (`dpper`, `dscom`, `dsinit`, `dspace`, `gstime`,
`initl`, `SatRec`, `sgp4`, `sgp4init`). Left out: the type declarations, `index.js`, `propagation.js`, `propagate.js`,
`dopplerFactor.js`, `shadow.js` and the WebAssembly builds. `../../sgp4-entry.js` imports from these files and Hugo's
`js.Build` bundles them, so the page loads them from this site only.
