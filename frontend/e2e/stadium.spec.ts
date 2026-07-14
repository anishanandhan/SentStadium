import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('StadiumPulse Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the backend API at the network boundary
    await page.route('**/api/zones', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            zone_id: 'zone-a',
            zone_name: 'Gate A — North Stand',
            crowd_density: 80,
            heat_index: 38,
            entry_rate: 20,
            risk_level: 'critical',
            capacity: 8000,
            current_occupancy: 6400,
            has_shade: true,
            has_hydration_point: true,
            languages_present: ['en'],
            last_updated: new Date().toISOString()
          }
        ])
      });
    });

    await page.route('**/api/zones/zone-a', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          zone: {
            zone_id: 'zone-a',
            zone_name: 'Gate A — North Stand',
            crowd_density: 80,
            heat_index: 38,
            entry_rate: 20,
            risk_level: 'critical',
            capacity: 8000,
            current_occupancy: 6400,
            has_shade: true,
            has_hydration_point: true,
            languages_present: ['en'],
            last_updated: new Date().toISOString()
          },
          trend: [],
          historical_incidents: []
        })
      });
    });

    await page.route('**/api/reason/zone-a', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          zone_id: 'zone-a',
          severity: 'critical',
          recommendation: 'Test recommendation.',
          reasoning: 'Test reasoning.',
          suggested_actions: ['Test action'],
          multilingual_alerts: { en: 'Test alert' },
          confidence: 0.95
        })
      });
    });

    await page.route('**/api/data/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Successfully processed', errors: [] })
      });
    });

    await page.route('**/api/alerts*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ alerts: [], total: 0, page: 1, page_size: 20 })
      });
    });
  });

  test('Fan-facing hero to dashboard flow', async ({ page }) => {
    // Navigate to Hero Page
    await page.goto('/');
    await expect(page).toHaveTitle(/StadiumPulse/);
    
    // Check for hero content
    await expect(page.getByText('Two systems. One blind spot.')).toBeVisible();
    
    // Accessibility scan on Hero
    const heroA11y = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main']).analyze();
    expect(heroA11y.violations).toEqual([]);
    
    // Click CTA to Dashboard
    await page.getByRole('button', { name: /Open Control Room Dashboard/i }).click();
    
    // Verify Dashboard loads
    await expect(page.getByText('Control Room — Organizer View')).toBeVisible();
    
    // Wait for mock data to load
    const zoneCard = page.getByRole('button', { name: /Gate A — North Stand/i });
    await expect(zoneCard).toBeVisible({ timeout: 10000 });
    
    // Accessibility scan on Dashboard
    const dashboardA11y = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main']).analyze();
    expect(dashboardA11y.violations).toEqual([]);
    
    // Click a zone to open drawer
    await zoneCard.click();
    
    // Verify Drawer opens
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('AI Recommendation')).toBeVisible();
  });

  test('Upload flow', async ({ page }) => {
    await page.goto('/dashboard/upload');
    await expect(page.getByText('Upload Data')).toBeVisible();
    
    // Upload a valid sample file
    const fileInput = page.locator('input[type="file"]');
    // We just simulate success since we mock the backend.
    await fileInput.setInputFiles({
      name: 'sample.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('zone_id,crowd_density\nzone-a,80\n')
    });
    
    // Assert success message (upload triggers automatically on change)
    await expect(page.getByText(/Successfully processed/i)).toBeVisible();
    
    // Navigate back to dashboard
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Malformed upload flow', async ({ page }) => {
    await page.route('**/api/data/upload', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: 'Invalid CSV format'
      });
    });
    await page.goto('/dashboard/upload');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('bad_data\n123\n')
    });
    
    await expect(page.getByText(/Invalid CSV format/i)).toBeVisible();
  });
});
