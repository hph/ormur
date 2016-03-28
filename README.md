# Ormur

[![Package Version](https://img.shields.io/npm/v/ormur.svg)](https://www.npmjs.com/package/ormur) [![Build Status](https://travis-ci.org/hph/ormur.svg?branch=master)](https://travis-ci.org/hph/ormur) [![Test Coverage](https://img.shields.io/codecov/c/github/hph/ormur.svg)](https://codecov.io/github/hph/ormur?branch=master) [![License](https://img.shields.io/npm/l/ormur.svg)](https://tldrlegal.com/license/mit-license)

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

## Examples

Check out the [basic example](https://github.com/hph/ormur/tree/master/example/basic)
for an example of a minimal base model and an example model inheriting from it.

For an example of how you may share schema between models, check the [advanced
example](https://github.com/hph/ormur/tree/master/example/advanced).

The `User` model defined in the above examples could be used like this,
assuming that the relevant database table exists:

```javascript
const User = require('./example/basic/user');

// Create an instance
const user = new User({ name: 'Hawk', email: 'test@example.com', password: 'password' });

// Persist it to the database
user.save().then(user => {
  console.log(`User ${user.name} with id ${user.id} saved.`);
});

// Find users with the name "Hawk"
User.where({ name: 'Hawk' }).then(users => {
  // Array of User instances.
  console.log(users);
});

// Find a user by its primary key and remove it from the database
User.find(1).then(user => user.destroy());

// Or, maybe more succintly
User.destroy(1);
```

## API

Documentation pending.

### Static methods

- `Ormur.find` - Find row by primary key.
- `Ormur.where` - Find rows by attributes.
- `Ormur.create` - Create row with attributes.
- `Ormur.destroy` - Remove row by primary key.

### Instance methods

- `Ormur#validate` - Validate attributes.
- `Ormur#save` - Insert row into database with attributes from instance.
- `Ormur#update` - Update existing row in database with attributes from instance.
- `Ormur#destroy` - Remove row from database by primary key of instance.
- `Ormur#setDefaults` - Set default values to instance attributes.
- `Ormur#merge` - Merge two objects (inheritance helper).
