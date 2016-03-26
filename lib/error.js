'use strict';

/**
 * A collection of error classes with descriptive names for Ormur.
 */


class ValidationError extends Error {
  constructor (message) {
    super();
    this.name = this.constructor.name;
    this.message = message;
  }
}

class ConfigurationError extends Error {
  constructor (message) {
    super();
    this.name = this.constructor.name;
    this.message = message;
  }
}


exports.ValidationError = ValidationError;
exports.ConfigurationError = ConfigurationError;
