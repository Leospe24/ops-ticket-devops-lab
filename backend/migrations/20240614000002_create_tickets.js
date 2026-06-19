/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.createTable('tickets', (table) => {
      table.increments('id').primary();
      table.string('title', 100).notNullable();
      table.text('description').notNullable();
      table.string('priority', 20).notNullable();
      table.string('status', 20).notNullable();
      table
        .uuid('creator_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table
        .uuid('assignee_id')
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(trx.fn.now());
      table.timestamp('updated_at').defaultTo(trx.fn.now());
    });

    // Add CHECK constraints using raw SQL for priority and status
    await trx.raw(
      `ALTER TABLE tickets
       ADD CONSTRAINT chk_tickets_priority
       CHECK (priority IN ('low', 'medium', 'high', 'critical'))`
    );

    await trx.raw(
      `ALTER TABLE tickets
       ADD CONSTRAINT chk_tickets_status
       CHECK (status IN ('open', 'in-progress', 'resolved'))`
    );

    // Indexes for common lookups
    await trx.raw(
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)'
    );
    await trx.raw(
      'CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)'
    );
    await trx.raw(
      'CREATE INDEX IF NOT EXISTS idx_tickets_creator_id ON tickets(creator_id)'
    );
    await trx.raw(
      'CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)'
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.schema.dropTableIfExists('tickets');
  });
};
