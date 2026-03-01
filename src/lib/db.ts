// Prisma database client
// Force reimport after schema changes
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Конфигурация логирования Prisma:
 * - development: query, error, warn (для отладки)
 * - production: error, warn (без query для безопасности и производительности)
 */
const logConfig = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error', 'warn']

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig as ('query' | 'error' | 'warn')[],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db