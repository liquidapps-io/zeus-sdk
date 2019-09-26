const { paccount } = require('../../common');

module.exports = {
  development: {
    dialect: "sqlite",
    logging: false,
    storage: `./db.development.${paccount}.sqlite`
  },
  // test: {
  //   dialect: "sqlite",
  //   logging: false,
  //   storage: ":memory:"
  // },
  test: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOSTNAME,
    dialect: 'postgres',
    logging: false,
    use_env_variable: 'DATABASE_URL'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOSTNAME,
    dialect: 'postgres',
    logging: false,
    use_env_variable: 'DATABASE_URL'
  }
};
