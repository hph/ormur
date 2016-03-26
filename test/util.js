'use strict';

const _ = require('lodash');
const expect = require('chai').expect;

const util = require('../lib/util');


describe('util', () => {
  const object = {
    snake_cased: true,
    camelCased: true
  };

  describe('snakeCased', () => {
    it('should morph the keys of an object to be snake_cased', () => {
      const morphed = util.snakeCased(object);
      expect(_.keys(morphed).length).to.eq(2);
      expect(morphed.snakeCased).to.be.undefined;
      expect(morphed.camelCased).to.be.undefined;
      expect(morphed.snake_cased).to.be.defined;
      expect(morphed.camel_cased).to.be.defined;
    });
  });

  describe('camelCased', () => {
    it('should morph the keys of an object to be camelCased', () => {
      const morphed = util.camelCased(object);
      expect(_.keys(morphed).length).to.eq(2);
      expect(morphed.snake_cased).to.be.undefined;
      expect(morphed.camel_cased).to.be.undefined;
      expect(morphed.snakeCased).to.be.defined;
      expect(morphed.camelCased).to.be.defined;
    });
  });

  describe('isUuid', () => {
    it('should only allow string params', () => {
      const invalidParams = [undefined, null, 0, ''];
      _.each(invalidParams, (param) => {
        expect(util.isUuid(param)).to.be.false;
      });
    });

    it('should validate whether the param is a uuid or not', () => {
      const invalidUuid = 'not a uuid';
      const validUuid = 'c3583df3-46c9-4afb-9255-601a179e1e10';
      expect(util.isUuid(invalidUuid)).to.be.false;
      expect(util.isUuid(validUuid)).to.be.true;
    });
  });
});
