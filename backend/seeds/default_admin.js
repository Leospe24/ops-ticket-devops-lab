const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@opsticket.local';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await knex('users')
    .insert({
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
    })
    .onConflict('email')
    .ignore();
};
