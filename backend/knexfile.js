require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Validate required environment variables
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`${key} environment variable is required`);
  }
}

const baseConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection,
      database: process.env.DB_NAME_TEST || 'opsticket_test',
    },
  },
  production: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  },
};
