async function ensureUserSchema(sequelize) {
  await sequelize.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
  `);
}

module.exports = { ensureUserSchema };
