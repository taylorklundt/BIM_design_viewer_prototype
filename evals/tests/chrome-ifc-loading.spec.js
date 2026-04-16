import { test, expect } from '@playwright/test';

async function setupChrome(page) {
  await page.goto('/chrome.html');
  await page.waitForFunction(() => window.__viewerAdapterReady === true, { timeout: 15000 });
}

test.describe('Chrome IFC Streaming Loading', () => {
  test.beforeEach(async ({ page }) => {
    await setupChrome(page);
  });

  test('shows progressive loading indicator while object stream is active', async ({ page }) => {
    await page.evaluate(() => {
      window.__streamEvents = [];
      window.__streamDone = false;
      window.__streamFailed = null;
      window.__indicatorSeen = false;

      const capture = (type) => (data) => {
        window.__streamEvents.push({ type, data });
      };

      window.viewer.on('stream-capability', capture('stream-capability'));
      window.viewer.on('object-load-progress', capture('object-load-progress'));
      window.viewer.on('model-stream-complete', () => {
        window.__streamDone = true;
      });
      window.viewer.on('load-error', (data) => {
        window.__streamFailed = data?.error || 'unknown load error';
      });

      window.__indicatorPoll = window.setInterval(() => {
        if (document.querySelector('.mv-object-streaming-indicator')) {
          window.__indicatorSeen = true;
        }
        if (window.__streamDone || window.__streamFailed) {
          window.clearInterval(window.__indicatorPoll);
        }
      }, 60);
    });

    await page.getByRole('button', { name: 'Condos Building' }).click();

    await page.waitForFunction(
      () => window.__streamDone || window.__streamFailed,
      { timeout: 120000 }
    );

    const result = await page.evaluate(() => ({
      failed: window.__streamFailed,
      indicatorSeen: window.__indicatorSeen,
      events: window.__streamEvents.map((e) => e.type),
      finalIndicatorVisible: !!document.querySelector('.mv-object-streaming-indicator'),
    }));

    expect(result.failed).toBeNull();
    expect(result.events).toContain('stream-capability');
    expect(result.events).toContain('object-load-progress');
    expect(result.indicatorSeen).toBe(true);
    expect(result.finalIndicatorVisible).toBe(false);
  });
});
