'use strict';

const Ormur = require('ormur');

const knexConnection = require('../knex');


/**
 * A simple base model for other models to inherit from. Check the User model
 * in the same directory for an example of subclassing this model. 
 *
 * The bare minimum that the base model needs to do is to set the Knex
 * connection instance, in order that we may run queries.
 *
 * See the advanced example for more options.
 */
class Model extends Ormur {
  constructor () {
    super(...arguments);
    this.knex = knexConnection;
  }
}


module.exports = Model;
