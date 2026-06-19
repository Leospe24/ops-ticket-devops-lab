/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await trx.schema.createTable('users', (table) => {
      table
        .uuid('id')
        .primary()
        .defaultTo(trx.raw('uuid_generate_v4()'));
      table.string('email', 255).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.string('role', 50).notNullable().checkIn(['admin', 'engineer', 'user']);
      table.timestamp('created_at').defaultTo(trx.fn.now());
    });

    // Explicit index on email (unique already creates an index, but we ensure it)
    await trx.raw(
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)'
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('users');
  });
};
