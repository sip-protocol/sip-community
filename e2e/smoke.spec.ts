import { test, expect } from '@playwright/test'

test('home responds and renders a body', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('body')).toBeVisible()
})

test('home renders the app shell landmarks', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Ask & Answer' }),
  ).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
})
