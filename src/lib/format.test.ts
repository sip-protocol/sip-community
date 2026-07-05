import { truncateAddress } from '@/lib/format'

test('truncates a Solana address to head…tail', () => {
  expect(truncateAddress('AbcD1234WXYZ5678', 4)).toBe('AbcD…5678')
})

test('returns short strings unchanged', () => {
  expect(truncateAddress('AbcD', 4)).toBe('AbcD')
})
