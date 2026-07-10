require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const baseConfig = {
  client: "postgresql",
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
    directory: "./migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};

const productionConfig = {
  ...baseConfig,
  connection: {
    ...baseConfig.connection,
  },
};

// Validate production environment variables
if (process.env.NODE_ENV === "production") {
  const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`${key} environment variable is required`);
    }
  }

  // Configure SSL
  if (process.env.DB_SSL === "true") {
    const sslConfig = { rejectUnauthorized: true };

    if (process.env.DB_SSL_CA) {
      // Import the file system module dynamically to read the certificate bundle
      const fs = require("fs");
      try {
        sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA, "utf8");
      } catch (err) {
        console.error(
          "❌ Failed to read DB_SSL_CA certificate file:",
          err.message,
        );
      }
    }

    productionConfig.connection.ssl = sslConfig;
  } else {
    productionConfig.connection.ssl = false;
  }
}

module.exports = {
  development: baseConfig,
  test: {
    ...baseConfig,
    connection: {
      ...baseConfig.connection,
      database: process.env.DB_NAME_TEST || "opsticket_test",
    },
  },
  production: productionConfig,
};
