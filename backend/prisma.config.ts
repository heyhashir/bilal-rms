import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Generation does not contact this fallback; migrate commands receive the real URL from the environment.
  datasource: {
    url: process.env.DATABASE_URL ?? 'mysql://prisma:prisma@127.0.0.1:3306/prisma',
  },
});
