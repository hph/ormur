'use strict';

const uuid = require('uuid');
const expect = require('chai').expect;

const Ormur = require('../lib');


describe('Ormur', () => {
  class BaseModel extends Ormur {
    constructor (attributes) {
      super(attributes);
      this.knexOptions = {
        client: 'postgresql',
        connection: 'postgres:///ormur'
      };
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
          type: 'string'
        },
        password: {
          type: 'string',
          transform: (value) => `!!!${value}!!!`,
          hidden: true
        },
        foreignTableId: {
          type: 'uuid'
        },
        isCool: {
          type: 'boolean'
        },
        createdAt: {
          type: 'date'
        }
      };
    }
  }

  let user;

  beforeEach(() => {
    user = new User({ id: 1, password: 'foobar' });
  });

  describe('Subclassing', () => {
    it('should allow subclassing', () => {
      expect(class Foo extends Ormur { }).to.not.throw;
    });

    it('should allow subclassing and setting columns with the constructor', () => {
      const ormur = new Ormur({ id: 1 });
      expect(ormur.id).to.be.undefined;
      expect(user.id).to.equal(1);
    });

    it('should allow subclassing to include common fields in a base model', () => {
      class WithPrimaryKey extends Ormur {
        constructor (attributes) {
          super(attributes);
          this.knexOptions = {
            client: 'postgresql',
            connection: 'postgres:///ormur'
          };
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

      const foo = new WithPrimaryKey({ id: 2, foo: 'bar' });
      expect(foo.id).to.eq(2);
      expect(foo.foo).to.not.eq('bar');

      const instance = new SubClassed({ id: 2, foo: 'bar' });
      expect(instance.id).to.eq(2);
      expect(instance.foo).to.eq('bar');
    });
  });

  describe('Columns', () => {
    function testInstantiation (Model, attributes) {
      try {
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

    it('should call the transform function when saving a value');

    it('should support promises in transform functions');

    it('should validate that columns with notNull set to true are not null', () => {
      try {
        new Message();
        expect(false).to.be.true;
      } catch (err) {
        expect(true).to.be.true;
      }
    });

    it('should run all custom column validations');
  });

  describe('Ormur#constructor', () => {
    it('should allow instantiation with attributes', () => {
      expect(user.id).to.eq(1);
    });

    it('should inflect the table name from the class name', () => {
      expect(user._tableName).to.eq('users');
    });

    it('should set up getters and setters for all valid attributes', () => {
      expect(user.id).to.eq(1);
      user.id = 2;
      expect(user.id).to.eq(2);
      user.foo = 1;
      expect(Object.getOwnPropertyDescriptor(user, 'id').get).to.be.defined;
      expect(Object.getOwnPropertyDescriptor(user, 'id').set).to.be.defined;
      expect(Object.getOwnPropertyDescriptor(user, 'foo').get).to.be.undefined;
      expect(Object.getOwnPropertyDescriptor(user, 'foo').set).to.be.undefined;
    });
  });

  describe('Ormur#save', () => {
    it('should persist the values to the database');
    it('should automatically convert camelCased values to snake_case');
    it('should update the instance primary key if it was not previously set');
  });

  describe('Ormur#update', () => {
    it('should persist the values to the database');
    it('should automatically convert camelCased values to snake_case');
  });

  describe('Ormur#destroy', () => {
    it('should delete the row from the database');
    it('should nullify the instance');
  });

  describe('Ormur#toJSON', () => {
    it('should return an object to be used by JSON.stringify', () => {
      expect(user.toJSON()).to.be.object;
      expect(JSON.parse(JSON.stringify(user))).to.eql(user.toJSON());
    });

    it('should omit columns with hidden set to true', () => {
      expect(user.toJSON().id).to.be.defined;
      expect(user.toJSON().password).to.be.undefined;
    });
  });

  describe('Ormur.find', () => {
    it('should find a record by the model\'s primary key');
    it('should resolve to an instance of the model if found');
    it('should resolve null if nothing was found');
  });

  describe('Ormur.where', () => {
    it('should find all records by the given attributes');
    it('should resolve to an array of instances if found');
    it('should resolve to an empty array if nothing was found');
  });

  describe('Ormur.create', () => {
    it('should persist the record to the database');
    it('should return a new instance of the model with the given attributes');
  });

  describe('Ormur.destroy', () => {
    it('should destroy the row from the database by primary key');
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
