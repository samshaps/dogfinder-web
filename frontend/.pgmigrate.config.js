/**
 * node-pg-migrate configuration
 * See: https://salsita.github.io/node-pg-migrate/#/config
 */

module.exports = {
  // Database connection string
  databaseUrl: process.env.DATABASE_URL,

  // Directory to store migration files
  dir: 'migrations',

  // Migration table name (tracks applied migrations)
  migrationsTable: 'pgmigrations',

  // Check order of migrations
  checkOrder: true,

  // File extension
  migrationFileExtension: '.sql',

  // Create schema if it doesn't exist
  schema: 'public',

  // Log executed queries
  verbose: true,

  // Reject on rollback
  rejectOnRollback: true,

  // Disable transaction wrapping (we'll handle it in SQL if needed)
  noTransaction: false,
};

