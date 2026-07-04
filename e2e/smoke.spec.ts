import { test, expect } from '@playwright/test'

test('home responds and renders a body', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('body')).toBeVisible()
})
