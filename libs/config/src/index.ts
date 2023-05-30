export default () => ({
  nodeEnv: process.env.NODE_ENV,
  database: {
    uri: process.env.DATABASE_HOST,
    name: process.env.DATABASE_NAME,
  },
  cache: {
    url: process.env.CACHE_URL,
    password: process.env.CACHE_PASSWORD,
  },
});
