const fs = require('fs');
const path = require('path');
const mustache = require('mustache')

const distDir = path.join(__dirname, '..', 'dist');

const initFile = path.join(distDir, 'init.js')

const templateFile = path.join(__dirname, '..', 'src', 'index.js.mustache');
const outFile = path.join(distDir, 'index.js')

const template = fs.readFileSync(templateFile).toString();
const init = fs.readFileSync(initFile).toString();
const rendered = mustache.render(template, {init});

const removedExports = rendered.replace(/exports\..+?\n/g, '\n')
  .replace(/\nObject\.defineProperty[\s\D]+?}\);/, '')

fs.writeFileSync(outFile, removedExports);
