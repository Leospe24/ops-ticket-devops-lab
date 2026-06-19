require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const knex = require('knex');
const knexConfig = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;

const db = knex(config);

module.exports = db;
