'use strict';

const _ = require('lodash');
const knex = require('knex');
const uuid = require('uuid');
const expect = require('chai').expect;

const Ormur = require('../lib');
const util = require('../lib/util');

const knexConnection = knex({
  client: 'postgresql',
  connection: 'postgres://postgres:@localhost:5432/ormur-test'
});


class BaseModel extends Ormur {
  constructor () {
    super(...arguments);
    this.knex = knexConnection;
  }
}

class User extends BaseModel {
  get schema () {
    return {
      id: {
        type: 'integer',
        primaryKey: true
      },
      name: {
        type: 'string',
        notNull: true
      },
      password: {
        type: 'string',
        transform: (value) => `!!!${value}!!!`,
        hidden: true
      },
      foreignTableId: {
        type: 'uuid',
        // This is only here to test that transforms can return Promises.
        transform: (value) => Promise.resolve(uuid.v4()),
        // This is only here to test that custom validations are run.
        validate: (value) => util.isUuid(value)
      },
      isCool: {
        type: 'boolean'
      },
      createdAt: {
        type: 'date',
        defaultValue: () => new Date()
      }
    };
  }
}


describe('Ormur', () => {
  describe('Subclassing', () => {
    it('should allow optional subclassing to include common fields in a base model', () => {
      class WithPrimaryKey extends Ormur {
        constructor (attributes) {
          super(attributes);
          this.knex = knexConnection;
        }

        get schema () {
          return this.merge({
            id: {
              type: 'integer',
              primaryKey: true
            }
          }, this.inheritedSchema);
        }
      }

      class SubClassed extends WithPrimaryKey {
        get inheritedSchema () {
          return {
            foo: {
              type: 'string'
            }
          };
        }
      }

      class Override extends WithPrimaryKey {
        get schema () {
          return {
            foo: {
              type: 'string'
            }
          };
        }
      }

      const superInstance = new WithPrimaryKey({ id: 1, foo: 'bar' });
      expect(superInstance.id).to.eq(1);
      expect(superInstance.foo).to.be.undefined;

      const subInstance = new SubClassed({ id: 1, foo: 'bar' });
      expect(subInstance.id).to.eq(1);
      expect(subInstance.foo).to.eq('bar');

      const overrideInstance = new Override({ foo: 'bar' });
      expect(overrideInstance.id).to.be.undefined;
      expect(overrideInstance.foo).to.eq('bar');
    });
  });

  describe('Ormur#constructor', () => {
    it('should inflect the table name from the class name', () => {
      const instance = new User();
      expect(instance._tableName).to.eq('users');
    });

    it('should allow instantiation with attributes', () => {
      const instance = new User({ id: 1 });
      expect(instance.id).to.eq(1);
    });

    it('should find and set the primary key', () => {
      const instance = new User();
      expect(instance._primaryKey).to.eq('id');
    });

    it('should allow instantiating for context only (for static methods)', () => {
      const instance = new User({ _empty: true });
      // We need the table name and primary key for many queries.
      expect(instance._tableName).to.be.defined;
      expect(instance._primaryKey).to.be.defined;
      // But we don't set any properties, as we're not actually passing meaningful attributes.
      expect(instance._properties).to.be.undefined;
    });

    it('should set up getters and setters for all schema columns', () => {
      const instance = new User({ id: 1 });
      _.each(_.keys(User.prototype.schema), (column) => {
        const propertyDescriptor = Object.getOwnPropertyDescriptor(instance, column);
        expect(propertyDescriptor.get).to.be.defined;
        expect(propertyDescriptor.set).to.be.defined;
      });
      expect(Object.getOwnPropertyDescriptor(instance, 'foo')).to.be.undefined;
      expect(Object.getOwnPropertyDescriptor(instance, 'foo')).to.be.undefined;
    });

    it('should automatically camelCase snake_cased keys', () => {
      const instance = new User({ is_cool: true });
      expect(instance.isCool).to.be.true;
      expect(instance.is_cool).to.be.undefined;
    });

    it('should store attributes in `_properties`', () => {
      const instance = new User();
      expect(instance._properties).to.eql({});
      instance.id = 1;
      expect(instance._properties).to.eql({ id: 1 });
      const attributes = { id: 2, name: 'Hawk' };
      const instanceWithAttributes = new User(attributes);
      expect(instanceWithAttributes._properties).to.eql(attributes);
    });

    it('should ensure that knex is configured', (cb) => {
      class InvalidBaseModel extends Ormur { }
      try {
        InvalidBaseModel.prototype._ensureMinimumConfiguration();
      } catch (err) {
        // We expect this to fail.
        expect(err).to.not.be.undefined;
      }
      cb();
    });
    it('should ensure that a primary key is configured');
  });

  describe('Validation', () => {
    function testInstantiation (Model, attributes, noName) {
      try {
        if (!noName) {
          attributes.name = attributes.name || 'temp';
        }
        new Model(attributes).validate();
        return true;
      } catch (err) {
        return false;
      }
    }

    it('should validate that integer column values are integers', () => {
      expect(testInstantiation(User, { id: 1 })).to.be.true;
      expect(testInstantiation(User, { id: 'foo' })).to.be.false;
    });

    it('should validate that string column values are strings', () => {
      expect(testInstantiation(User, { name: '123123' })).to.be.true;
      expect(testInstantiation(User, { name: 123123 })).to.be.false;
    });

    it('should validate that uuid column values are uuids', () => {
      expect(testInstantiation(User, { foreignTableId: uuid.v4() })).to.be.true;
      expect(testInstantiation(User, { foreignTableId: 'foo' })).to.be.false;
    });

    it('should validate that boolean column values are booleans', () => {
      expect(testInstantiation(User, { isCool: true })).to.be.true;
      expect(testInstantiation(User, { isCool: 'foo' })).to.be.false;
    });

    it('should validate that date column values are dates', () => {
      expect(testInstantiation(User, { createdAt: new Date() })).to.be.true;
      expect(testInstantiation(User, { isCool: 'foo' })).to.be.false;
    });

    it('should validate presence of a value or default value of notNull columns', () => {
      expect(testInstantiation(User, {}, true)).to.be.false;
    });

    it('should validate that values and default values match column types');
    it('should validate columns with their custom column validators', (cb) => {
      class WithCustomValidator extends BaseModel {
        get schema () {
          return {
            id: {
              type: 'integer',
              primaryKey: true,
              validate: (value) => value > 0
            },
          }
        }
      }

      const instance = new WithCustomValidator({ id: 0 });
      try {
        instance.validate();
      } catch (err) {
        // Expected to fail.
        expect(err).to.not.be.undefined;
        cb();
      }
    });
  });

  describe('Ormur#setDefaults', () => {
    it('should set the default values to columns without defined values', () => {
      const instance = new User();
      instance.setDefaults();
      expect(instance.createdAt).to.be.defined;
    });
  });

  describe('Ormur#callTransforms', () => {
    it('should call transform functions', () => {
      const instance = new User({ password: 'foo' });
      return instance.callTransforms().then(() => {
        expect(instance.password).to.eq('!!!foo!!!');
      });
    });

    it('should always resolve a promise, even when the transform does not', () => {
      class TransformModel extends BaseModel {
        get schema () {
          return {
            id: {
              type: 'integer',
              primaryKey: true,
              transform: (value) => value + 1
            }
          };
        }
      }

      const instance = new TransformModel({ id: 1 });
      return instance.callTransforms().then(() => {
        expect(instance.id).to.eq(2);
      });
    });
  });

  describe('Ormur#beforeSave', () => {
    it('should call `validate`, `setDefaults` and `callTransforms`');
  });

  describe('Ormur#save', () => {
    it('should insert a new row into the database and update the primary key of the instance', () => {
      const instance = new User({ name: 'Ormur' });
      expect(instance.id).to.be.undefined;
      return instance.save().then(user => {
        expect(user.id).to.be.defined;
      });
    });
  });

  describe('Ormur#update', () => {
    it('should update an existing row', () => {
      return User.create({ name: 'Falcon' }).then(user => {
        expect(user.name).to.eq('Falcon');
        user.name = 'Hawk';
        return user.update();
      }).then(user => {
        expect(user.name).to.eq('Hawk');
      });
    });
  });

  describe('Ormur#destroy', () => {
    it('should delete the row from the database, returning null', () => {
      let id;
      return User.create({ name: 'Hawk' }).then(user => {
        id = user.id;
        return user.destroy();
      }).then(result => {
        expect(result).to.be.null;
        return User.find(id);
      }).then(user => {
        expect(user).to.be.null;
      });
    });
  });

  describe('Ormur#toJSON', () => {
    it('should return an object to be used by JSON.stringify', () => {
      const instance = new User({ id: 1, name: 'Hawk' });
      expect(instance.toJSON()).to.be.object;
      expect(JSON.parse(JSON.stringify(instance))).to.eql(instance.toJSON());
    });

    it('should omit columns with hidden set to true', () => {
      const instance = new User({ id: 1, password: 'password123' });
      expect(instance.toJSON().id).to.be.defined;
      expect(instance.toJSON().password).to.be.undefined;
    });
  });

  describe('Ormur.find', () => {
    it('should find a record by primary key and resolve to the instance', () => {
      let id;
      return User.create({ name: 'Hawk' }).then(user => {
        id = user.id;
        return User.find(id);
      }).then(user => {
        expect(user.id).to.eq(id);
        expect(user.name).to.eq('Hawk');
      });
    });

    it('should resolve null if nothing is found', () => {
      return User.find(0).then(user => {
        expect(user).to.be.null;
      });
    });
  });

  describe('Ormur.where', () => {
    it('should find all records by the given attributes and return instances', () => {
      const attributes = { name: 'Hawk' };
      const ids = [];
      return User.create(attributes).then(user => {
        ids.push(user.id);
        return User.create(attributes);
      }).then(user => {
        ids.push(user.id);
        return User.where(attributes);
      }).then(users => {
        users = _.filter(users, (user) => _.includes(ids, user.id));
        expect(users.length).to.eq(2);
      });
    });

    it('should resolve to an empty array if nothing was found', () => {
      return User.where({ name: 'Nobody exists with this name' }).then(users => {
        expect(users.length).to.eq(0);
      });
    });
  });

  describe('Ormur.create', () => {
    it('should create a new instance and persist the data', () => {
      return User.create({ name: 'Hawk' }).then(user => {
        expect(user.id).to.be.defined;
        expect(user.constructor).to.eq(User);
      });
    });
  });

  describe('Ormur.destroy', () => {
    it('should destroy the row from the database by primary key and resolve to null', () => {
      let id;
      return User.create({ name: 'Hawk' }).then(user => {
        id = user.id;
        expect(id).to.be.defined;
        return User.destroy(id);
      }).then(res => {
        expect(res).to.be.null;
        return User.find(id);
      }).then(res => {
        expect(res).to.be.null;
      });
    });
  });

  it('should perhaps warn about trying to write columns that dont exist');
  it('should ensure that a primary key is defined in columns');
  it('should not validate unset attributes if they don\'t have notNull');
  it('callTransforms should use reduce and everything using it should await it');
  it('should only insert if data has not been inserted, otherwise update on save');
  it('should expose a query interface');
  it('should automatically convert attributes camelCase on read');
  it('should automatically convert attributes to snake_case on write');
  it('should test knex interop');
  it('should allow validating a specific field');
  it('should have associations');
  it('should check if table exists on initialization');
  it('should validate the type of the param attribute(s) in static methods via type validations');
  it('should allow falsy values (except undefined) in validations');
  it('should define helpers for common columns such as timestamps');
});
