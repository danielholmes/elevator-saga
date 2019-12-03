const fs = require('fs');
const path = require('path');
const mustache = require('mustache')

const distDir = path.join(__dirname, '..', 'dist');

const initFile = path.join(distDir, 'init.js')

const templateFile = path.join(__dirname, '..', 'src', 'index.js.mustache');
const outFile = path.join(distDir, 'index.js')

const template = fs.readFileSync(templateFile).toString();
const initRaw = fs.readFileSync(initFile).toString();
const init = initRaw.replace(/exports\..+?\n/g, '\n')
  .replace(/exports\["default"\] = _default;/, '')
  .replace(/\nObject\.defineProperty[\s\D]+?}\);/, '')
  .replace(/function _default\(\) \{/, '')
  .replace(/\}\s+?$/, '')

const rendered = mustache.render(template, {init});

fs.writeFileSync(outFile, rendered);
