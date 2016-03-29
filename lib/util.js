'use strict';

/**
 * A collection of utilities for Ormur.
 */

const _ = require('lodash');


/**
 * Morph the keys of the given object so that they are snake_cased.
 *
 * @param {Object} obj The object to morph.
 * @returns {Object} The morphed object.
 */
function snakeCased (obj) {
  return _.reduce(obj, (memo, value, key) => {
    memo[_.snakeCase(key)] = value;
    return memo;
  }, {});
}

/**
 * Morph the keys of the given object so that they are camelCased.
 *
 * @param {Object} obj The object to morph.
 * @returns {Object} The morphed object.
 */
function camelCased (obj) {
  return _.reduce(obj, (memo, value, key) => {
    memo[_.camelCase(key)] = value;
    return memo;
  }, {});
}

/**
 * Check whether a string is a UUID, as per RFC4122.
 *
 * @param {String} string The string value to check.
 * @returns {Boolean} True if the string is a UUID; otherwise false.
 */
function isUuid (string) {
  if (!_.isString(string)) {
    return false;
  }
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return !!string.match(regex);
}


exports.snakeCased = snakeCased;
exports.camelCased = camelCased;
exports.isUuid = isUuid;
