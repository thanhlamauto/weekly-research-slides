'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const SCHEMA_DIR = path.join(__dirname, '..', '..', 'schemas');
const CACHE = new Map();

function loadData(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(text);
  return yaml.load(text);
}

function dumpData(obj) {
  return yaml.dump(obj, { noRefs: true, lineWidth: 100, sortKeys: false });
}

function readSchema(name) {
  if (!CACHE.has(name)) {
    CACHE.set(name, JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${name}.schema.json`), 'utf8')));
  }
  return CACHE.get(name);
}

function validateData(schemaName, data) {
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  const validate = ajv.compile(readSchema(schemaName));
  const schema = schemaName.replace('.schema', '');
  const ok = validate(data);
  const errors = (validate.errors || []).map((e) => ({
    path: e.instancePath || '/',
    message: `${e.message}${e.params && e.params.additionalProperty ? ` (${e.params.additionalProperty})` : ''}`,
  }));
  return { ok: !!ok, errors, schema };
}

module.exports = { loadData, dumpData, validateData, readSchema, SCHEMA_DIR };
