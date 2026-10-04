// Tiny JSON-file "database". Pure JavaScript on purpose, so it installs
// cleanly on Windows without any C++ build tools.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const cache = {};
let queue = Promise.resolve();

function filePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

// Reads a collection (array) once and keeps it in memory.
function read(name) {
  if (!cache[name]) {
    try {
      cache[name] = JSON.parse(fs.readFileSync(filePath(name), 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        cache[name] = [];
      } else {
        throw new Error('Could not read ' + name + '.json: ' + err.message);
      }
    }
  }
  return cache[name];
}

// Writes go through a queue so two requests never write the same file at once.
// We write to a temp file first and rename, so a crash can't leave half a file.
function save(name) {
  const target = filePath(name);
  const tmp = target + '.tmp';
  const snapshot = JSON.stringify(cache[name], null, 2);
  queue = queue
    .catch(() => {})
    .then(() => fs.promises.writeFile(tmp, snapshot))
    .then(() => fs.promises.rename(tmp, target));
  return queue;
}

function nextId(name) {
  return read(name).reduce((max, row) => Math.max(max, row.id || 0), 0) + 1;
}

module.exports = { read, save, nextId };
