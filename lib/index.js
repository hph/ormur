'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const inflection = require('inflection');

const util = require('./util');
const error = require('./error');


class Ormur {

  constructor (attributes) {
    this._tableName = inflection.tableize(this.constructor.name);
    this._applySchema(attributes || {});

    // Defer execution until the next tick in the event loop.
    // This allows us to modify `this` in a child constructor
    // after calling `super`.
    process.nextTick(() => this._ensureMinimumConfiguration());
  }

  /**
   * Read the provided attributes and configure the model instance.
   */
  _applySchema (attributes) {
    _.each(this.schema, (rules, column) => {
      if (rules.primaryKey) {
        this._primaryKey = column;
      }
    });

    // The class is being instantiated only to get a context for
    // static methods; do nothing.
    if (attributes._empty) {
      return;
    }

    // Read into properties from the provided attributes.
    this._properties = _.merge(_.reduce(this.schema, (memo, _rules, column) => {
      const attributeValue = attributes[column];
      const snakeCasedAttributeValue = attributes[_.snakeCase(column)];
      if (!_.isUndefined(attributeValue)) {
        memo[column] = attributeValue;
      } else if (!_.isUndefined(snakeCasedAttributeValue)) {
        memo[column] = snakeCasedAttributeValue;
      }

      // Create a getter and setter for this column.
      Object.defineProperty(this, column, {
        get: () => this._properties[column],
        set: (value) => this._properties[column] = value
      });

      return memo;
    }, {}), this._properties);
  }

  /**
   * Ensure that the model class is correctly configured for Ormur to work.
   */
  _ensureMinimumConfiguration () {
    if (_.isUndefined(this.knex)) {
      throw new error.ConfigurationError('Knex has not been configured.');
    }

    if (_.isUndefined(this._primaryKey)) {
      throw new error.ConfigurationError('A primary key must be defined.');
    }
  }

  /**
   * Validate all columns against the built-in validations
   * along with any configured column validation functions.
   */
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
      if (rules.notNull && (_.isUndefined(value) || _.isNull(value))) {
        throw new error.ValidationError(`${column} cannot be null`);
      }

      // Check that the type of the value matches the type rule.
      if (!_.isUndefined(value) && !_.isNull(value) && !rules.auto) {
        if (rules.type === 'string' && !_.isString(value) ||
            rules.type === 'integer' && !_.isInteger(value) ||
            rules.type === 'boolean' && !_.isBoolean(value) ||
            rules.type === 'date' && !_.isDate(value) ||
            rules.type === 'uuid' && !util.isUuid(value)) {
          throw new error.ValidationError(`${column} must be of type ${rules.type}`);
        }
      }

      // Check custom validation rules.
      if (!_.isUndefined(value) && _.isFunction(rules.validate)) {
        if (!rules.validate(value)) {
          throw new error.ValidationError(`column validation failed for ${column}`);
        }
      }
    });

    return true;
  }

  /**
   * Set the default values (if any) to columns without values.
   */
  setDefaults () {
    _.each(this.schema, (rules, column) => {
      let value = this._properties[column];
      if (_.isUndefined(value) && rules.defaultValue) {
        value = rules.defaultValue;
        if (_.isFunction(value)) {
          value = value();
        }
        this._properties[column] = value;
      }
    });
  }

  /**
   * Transform the values of all columns with a defined transform function.
   * If the transform functions return a promise, they will be awaited.
   *
   * @returns {Promise}
   */
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

  /**
   * Process the instance before saving, by validating the data, setting
   * defaults and calling transform functions if required.
   *
   * @param {String} [type="update"] Specify whether this is an update or not.
   * @returns {Promise}
   */
  beforeSave () {
    this.validate();
    this.setDefaults();
    return this.callTransforms();
  }

  /**
   * Insert a new row into the database with the current values.
   *
   * @returns {Promise} Resolves to a new Ormur model instance with the resulting data.
   */
  save () {
    return this.beforeSave().then(() => {
      return this.knex
        .insert(util.snakeCased(this._properties), this._primaryKey)
        .into(this._tableName)
        .returning('*')
        .then(results => new this.constructor(results[0]));
    });
  }

  /**
   * Update an existing row in the database with the current values.
   *
   * @returns {Promise} Resolves to a new Ormur model instance with the resulting data.
   */
  update () {
    return this.beforeSave().then(() => {
      return this.knex(this._tableName)
        .where(this._primaryKey, this[this._primaryKey])
        .returning('*')
        .update(util.snakeCased(this._properties))
        .then(results => new this.constructor(results[0]));
    });
  }

  /**
   * Remove the row from the database.
   *
   * @returns {Promise} Resolves to null.
   */
  destroy () {
    return this.knex(this._tableName)
      .where(this._primaryKey, this[this._primaryKey])
      .del()
      .then(() => null);
  }

  /**
   * Ensure that hidden (private) columns are not included when
   * JSON.stringify is called on the instance.
   *
   * @returns {Object} The public properties of the instance.
   */
  toJSON () {
    const hiddenColumns = _(this.schema)
      .map((value, key) => value.hidden ? key : null).compact().value();
    return util.camelCased(_.omit(this._properties, hiddenColumns));
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

  /**
   * Find a row by primary key.
   *
   * @param {Integer|String} primaryKeyValue The value of the primary key.
   * @returns {Promise} Resolves to a new Ormur model instance with the result or null.
   */
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

  /**
   * Find all rows matching the provided options.
   *
   * @param {Object} attributes The keys and values with which to filter.
   * @returns {Promise} Resolves to an array containing Ormur model instances from results if any.
   */
  static where (attributes) {
    const instance = new this({ _empty: true });
    return instance.knex(instance._tableName)
      .where(util.snakeCased(attributes))
      .then(results => _.map(results, (result) => new this(result)));
  }

  /**
   * Create a model instance with the provided attributes and save it.
   *
   * @param {Object} attributes The attributes for the instance.
   * @returns {Promise} Resoolves to a new Ormur model instance with the result.
   */
  static create (attributes) {
    return new this(attributes).save();
  }

  /**
   * Remove a row by primary key.
   *
   * @param {Integer|String} primaryKeyValue The value of the primary key.
   * @returns {Promise} Resolves to null.
   */
  static destroy (primaryKeyValue) {
    const instance = new this({ _empty: true });
    instance[instance._primaryKey] = primaryKeyValue;
    return instance.destroy();
  }

}


module.exports = Ormur;
