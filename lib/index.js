'use strict';

const _ = require('lodash');
const knex = require('knex');
const Promise = require('bluebird');
const inflection = require('inflection');

const util = require('./util');
const error = require('./error');


class Ormur {

  constructor (attributes) {
    this._attributes = attributes || {};
    this._tableName = inflection.tableize(this.constructor.name);
    this._applySchema();

    // Defer execution until the next tick in the event loop.
    // This allows us to modify `this` in a child constructor
    // after calling `super`.
    process.nextTick(() => {
      this._applyConstraints();
    });
  }

  /**
   * Create a Knex instance from the given configuration options and
   * set it to `this.knex`.
   *
   * @param {Object} options The Knex configuration options.
   * @returns {Knex} The Knex instance.
   */
  set knexOptions (options) {
    return this.knex = knex(options);
  }

  /**
   * Ensure that the provided attributes match the given schema.
   */
  _applySchema () {
    _.each(this.schema, (rules, column) => {
      if (rules.primaryKey) {
        this._primaryKey = column;
      }
    });

    // The class is being instantiated only to get a context for
    // static methods; do nothing.
    if (this._attributes._empty) {
      delete this._attributes;
      return;
    }

    // Read into properties from the provided attributes.
    this._properties = _.merge(_.reduce(this.schema, (memo, _rules, column) => {
      const attributeValue = this._attributes[column];
      const snakeCasedAttributeValue = this._attributes[_.snakeCase(column)];
      if (!_.isUndefined(attributeValue)) {
        memo[column] = attributeValue;
      } else if (!_.isUndefined(snakeCasedAttributeValue)) {
        memo[column] = snakeCasedAttributeValue;
      }

      Object.defineProperty(this, column, {
        get: () => this._properties[column],
        set: (value) => this._properties[column] = value
      });

      return memo;
    }, {}), this._properties);
    
    delete this._attributes;
  }

  /**
   * Ensure that the model class is correctly defined for Ormur to work.
   */
  _applyConstraints () {
    if (_.isUndefined(this.knex)) {
      throw new error.ConfigurationError('Knex has not been configured.');
    }

    if (_.isUndefined(this._primaryKey)) {
      throw new error.ConfigurationError('A primary key must be defined.');
    }
  }

  /**
   * Merge two objects.
   *
   * @param {Object} destination The destination object.
   * @param {Object} source The source object.
   * @returns {Object} The `destination` object merged with the `source` object.
   */
  merge (destination, source) {
    return _.merge(destination, source);
  }

  validate () {
    _.each(this.schema, (rules, column) => {
      let value = this._properties[column];

      // Temporarily set the default value if the value has not been set.
      if (_.isUndefined(value) && !_.isUndefined(rules.defaultValue)) {
        value = rules.defaultValue;
        if (_.isFunction(value)) {
          value = value();
        }
      }

      // Check notNull rule.
      if (rules.notNull && _.isUndefined(value)) {
        throw new error.ValidationError(`${column} cannot be null`);
      }

      // Check that the type of the value matches the type rule.
      if (!_.isUndefined(value) && !rules.auto) {
        if (rules.type === 'string' && !_.isString(value) ||
            rules.type === 'integer' && !_.isInteger(value) ||
            rules.type === 'boolean' && !_.isBoolean(value) ||
            rules.type === 'date' && !_.isDate(value) ||
            rules.type === 'uuid' && !util.isUuid(value)) {
          throw new error.ValidationError(`${column} must be a ${rules.type}`);
        }
      }

      // Check custom validation rules.
      if (!_.isUndefined(value) && rules.validate) {
        if (!rules.validate(value)) {
          throw new error.ValidationError(`column validation failed for ${column}`);
        }
      }
    });

    return true;
  }

  setDefaults () {
    _.each(this.schema, (rules, column) => {
      let value = this._properties[column];
      if (_.isUndefined(value) && !_.isUndefined(rules.defaultValue)) {
        value = rules.defaultValue;
        if (_.isFunction(value)) {
          value = value();
        }
        this._properties[column] = value;
      }
    });
  }

  callTransforms () {
    const promises = {};
    _.each(this.schema, (rules, column) => {
      const value = this._properties[column];
      if (rules.transform) {
        this._properties[column] = rules.transform(value);
        if (this._properties[column].then) {
          promises[column] = this._properties[column];
        }
      }
    });

    if (!_.isEmpty(promises)) {
      return Promise.props(promises).then(results => {
        _.each(_.keys(promises), (key) => {
          this._properties[key] = results[key];
        });
      });
    }

    return Promise.resolve();
  }

  beforeSave () {
    this.validate();
    this.setDefaults();
    return this.callTransforms();
  }

  save () {
    return this.beforeSave().then(() => {
      return this.knex
        .insert(util.snakeCased(this._properties), this._primaryKey)
        .into(this._tableName)
        .then(results => {
          if (this._primaryKey) {
            this._properties[this._primaryKey] = results[0];
          }
          return this;
        });
    });
  }

  update (attributes) {
    return this.beforeSave().then(() => {
      return this.knex(this._tableName)
        .where(this._primaryKey, this._properties[this._primaryKey])
        .update(attributes)
        .then(() => {
          return this;
        });
    });
  }

  destroy () {
    return this.knex(this._tableName)
      .where(this._primaryKey, this._properties[this._primaryKey])
      .del()
      .then(() => null);
  }

  toJSON () {
    const hiddenColumns = _(this.schema)
      .map((value, key) => value.hidden ? key : null).compact().value();
    return util.camelCased(_.omit(this._properties, hiddenColumns));
  }

  static find (primaryKeyValue) {
    const instance = new this({ _empty: true });
    return instance.knex(instance._tableName)
      .where(instance._primaryKey, primaryKeyValue)
      .then(results => {
        if (!_.isEmpty(results)) {
          return new this(results[0]);
        }
        return null;
      });
  }

  static where (options) {
    const instance = new this({ _empty: true });
    return instance.knex(instance._tableName)
      .where(options)
      .then(results => _.map(results, (result) => new this(result)));
  }

  static all () {
    return this.where({});
  }

  static create (attributes) {
    return new this(attributes).save();
  }

  static destroy (primaryKeyValue) {
    const instance = new this({ _empty: true });
    instance[instance._primaryKey] = primaryKeyValue;
    return instance.destroy();
  }

}


module.exports = Ormur;
