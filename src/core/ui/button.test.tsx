import { render, screen } from '@testing-library/react'
import { Button } from '@/core/ui/button'

test('renders a button with its label', () => {
  render(<Button>Ask</Button>)
  expect(screen.getByRole('button', { name: 'Ask' })).toBeInTheDocument()
})
