'use strict';

const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcrypt'));

const Model = require('./model');


/**
 * A simple user model. Part of the schema is implicitly inherited from Model,
 * i.e., the primary key and the timestamps.
 */
class User extends Model {
  get childSchema () {
    return {
      email: {
        type: 'string',
        notNull: true,
        hidden: true,
        validate: (value) => value.includes('@')
      },
      password: {
        type: 'string',
        notNull: true,
        hidden: true,
        transform: this.encryptPassword,
        validate: (value) => value.length >= 6
      },
      name: {
        type: 'string',
        notNull: true
      }
    };
  }

  /**
   * Salt and hash the password with bcrypt.
   *
   * @param {String} password The password to encrypt.
   * @returns {Promise} Resolves to the encrypted password.
   */
  encryptPassword (password) {
    return bcrypt.genSaltAsync(10).then(salt => {
      return bcrypt.hashAsync(password, salt);
    });
  }
}


module.exports = User;
