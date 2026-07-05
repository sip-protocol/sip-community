import { truncateAddress } from '@/lib/format'

test('truncates a Solana address to head…tail', () => {
  expect(truncateAddress('AbcD1234WXYZ5678', 4)).toBe('AbcD…5678')
})

test('returns short strings unchanged', () => {
  expect(truncateAddress('AbcD', 4)).toBe('AbcD')
})

test('returns the input unchanged when keep is 0', () => {
  expect(truncateAddress('AbcD1234WXYZ5678', 0)).toBe('AbcD1234WXYZ5678')
})

test('defaults keep to 4 when omitted', () => {
  expect(truncateAddress('AbcD1234WXYZ5678')).toBe('AbcD…5678')
})
