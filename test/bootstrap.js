#!/usr/bin/env node
'use strict';

const exec = require('child_process').exec;


exec(`psql -c 'create database "ormur-test";' -U postgres`, () => {
  const knex = require('knex')({
    client: 'postgresql',
    connection: 'postgres://postgres:@localhost:5432/ormur-test'
  });
  
  knex.schema.createTableIfNotExists('users', (table) => {
    table.increments();
    table.string('name').notNullable();
    table.string('password');
    table.string('foreign_table_id');
    table.bool('is_cool');
    table.date('created_at');
  }).then(() => {
    setTimeout(() => {
      process.exit();
    }, 1000);
  });
});
