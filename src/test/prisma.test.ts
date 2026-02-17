import { expect, test } from 'vitest';
import { PrismaClient } from '../generated/prisma/client';

test('PrismaClient is defined', () => {
  expect(PrismaClient).toBeDefined();
});
