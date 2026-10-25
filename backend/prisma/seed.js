import { seed } from '../src/seed.js';
import { prisma } from '../src/util.js';

seed()
  .then(() => console.log('Seed ok'))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
