'use strict';

const Ormur = require('ormur');

const knexConnection = require('../knex');


/**
 * A more advanced base model for other models to inherit from. Check the User
 * model in the same directory for an example of subclassing this model. 
 *
 * This example shows how you can define a shared, common schema for multiple
 * models and how to extend the core functionality of Ormur.
 *
 * For the bare minimum of what you need to get started, look at the basic
 * example instead.
 */
class Model extends Ormur {
  constructor () {
    super(...arguments);
    this.knex = knexConnection;
  }

  // This schema will be used by all models subclassing this base model.
  // In order to define their own schema, subclasses can redefine the `schema`
  // getter or create a `childSchema` getter.
  get schema () {
    return this.merge({
      id: {
        type: 'integer',
        primaryKey: true
      },
      createdAt: {
        type: 'date',
        defaultValue: () => new Date()
      },
      updatedAt: {
        type: 'date',
        defaultValue: () => new Date()
      }
    }, this.childSchema);
  }
}


module.exports = Model;
