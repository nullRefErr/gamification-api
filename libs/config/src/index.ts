export default () => ({
  nodeEnv: process.env.NODE_ENV,
  database: {
    uri: process.env.DATABASE_HOST,
    name: process.env.DATABASE_NAME,
  }
});
