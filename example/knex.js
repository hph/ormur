'use strict';

const knex = require('knex');


/**
 * Initialize Knex, creating a database connection.
 *
 * The options provided to the Knex initializer below assume that you have
 * Postgres installed. It's up to you to initialize Knex correctly for your use
 * case, but I would personally advise using a "knexfile" to store the config,
 * which can then also be used for the Knex command-line tool (for migrations).
 *
 * Relevant docs:
 * - http://knexjs.org/#installation-client
 * - http://knexjs.org/#knexfile
 */
const knexConnection = knex({
  client: 'postgresql',
  connection: 'postgres:///postgres'
});


module.exports = knexConnection;
