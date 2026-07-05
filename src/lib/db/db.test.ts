import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

test('connects to Neon and runs a query', async () => {
  const result = await db.execute(sql`select 1 as ok`)
  expect(result.rows[0].ok).toBe(1)
})
