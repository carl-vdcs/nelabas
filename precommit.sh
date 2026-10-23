#!/bin/sh
# Vérifications avant push : syntaxe, lint de récits, chargement dans le navigateur
set -e
node --check engine.js && node --check events.js && node --check data.js && node --check geo.js && node --check scene.js
node tests/data.mjs
node tests/static.mjs 70
node tests/coverage.mjs 600
node lint.mjs 150
