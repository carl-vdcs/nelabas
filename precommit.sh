#!/bin/sh
# Vérifications avant push : syntaxe, lint de récits, chargement dans le navigateur
set -e
node --check engine.js && node --check events.js && node --check data.js && node --check geo.js && node --check scene.js
node lint.mjs 150
