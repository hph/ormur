# Ormur [![Build Status](https://travis-ci.org/hph/ormur.svg?branch=master)](https://travis-ci.org/hph/ormur) [![Package Version](https://img.shields.io/npm/v/ormur.svg)](https://www.npmjs.com/package/ormur) [![Node Version](https://img.shields.io/node/v/ormur.svg)](https://nodejs.org/en/)

> A simple, sane & modern ORM library for Node.js

## Features

- High extensibility and behaviour customization via inheritance.
- Schema validation and custom field validations.
- High-level query interface along with a [Knex](http://knexjs.org/) instance for custom queries.
- Use promises instead of callbacks to interact with the database.
- Default values and value transformations before creating records.
- Automatic `snake_case` (for the database) and `camelCase` (for JavaScript) handling.
- Safe JSON serialization by omitting private fields.

And much more - see the example below to get an idea.

## Install

Requires Node.js v4.0.0 or higher.

    npm install ormur

## Example

You will have to create a base model for other models to inherit from.
This model should (at a minumum) set `this.knexOptions` and can optionally
define a base schema and override Ormur methods.

See [Knex initialization](http://knexjs.org/#Installation-client)
and [Knexfile](http://knexjs.org/#knexfile) for Knex configuration options.

```javascript
'use strict';

const Ormur = require('ormur');

class BaseModel extends Ormur {
  constructor () {
    super(...arguments); // The spread operator is available in Node.js v5.0.0+.
    this.knexOptions = {
      client: 'postgresql',
      connection: 'postgres:///ormur'
    };
  }

  // Defining schema in the base model is completely optional.
  get schema () {
    return this.merge({
      id: {              // The keys denote the field name.
        type: 'integer', // Types are used to validate the data before saving.
        primaryKey: true // A primary key is required to be able to run queries.
      },
      createdAt: { // Keys are automatically snake_cased before data is persisted.
        type: 'date',
        defaultValue: () => new Date() // Set a value to the field before saving.
      },
      updatedAt: {
        type: 'date',
        defaultValue: () => new Date()
      }
    }, this.childSchema);
  }
}
```

This example assumes that you're using Postgres and have a table called
`ormur`. You can also simply set `this.knex` to the content of your Knexfile.

Now you can create a model inheriting from `BaseModel`:

```javascript
'use strict';

const BaseModel = require('./base-model');

// These imports are only required for the example User model below (see `encryptPassword`).
const Promise = require('bluebird');
const bcrypt = Promise.promisifyAll(require('bcrypt'));


class User extends BaseModel {
  // This schema definition is merged in the base model. If no schema were
  // defined there, you would simply define a `schema` getter here instead.
  // You can also define a schema getter here if you wanted to override the
  // base schema.
  get childSchema () {
    return {
      email: {
        type: 'string',
        notNull: true, // A built-in validation.
        hidden: true,  // Do not include this field when the model is serialized.
        validate: (value) => value.includes('@') // A custom validation.
      },
      password: {
        type: 'string',
        notNull: true,
        hidden: true,
        transform: this.encryptPassword, // Transform the value of the field before saving.
        validate: (value) => value.length >= 6
      },
      name: {
        type: 'string',
        notNull: true
      }
    };
  }

  /**
   * Return the password salted and hashed with bcrypt.
   *
   * @param {String} password The password to encrypt.
   * @returns {String} The encrypted password.
   */
  encryptPassword (password) {
    return bcrypt.genSaltAsync(10).then(salt => {
      return bcrypt.hashAsync(password, salt);
    });
  }
}
```

Using the above model is quite simple:

```javascript
'use strict';

const User = require('./user');

// Create an instance of User.
const user = new User({ name: 'Example', email: 'example@example.com', password: 'password' });

// Save the user and print the id created by the database.
user.save().then(user => console.log(user.id));

// Find a user by id and print it.
User.find(1).then(user => console.log(user));
```
