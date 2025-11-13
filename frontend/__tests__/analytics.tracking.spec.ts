import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ANALYTICS_EVENT = 'find_started';

describe('analytics tracking', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubGlobal('window', {});
    process.env.NEXT_PUBLIC_FEATURE_ANALYTICS = 'true';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_FEATURE_ANALYTICS;
  });

  it('queues events until Umami is ready and flushes when available', async () => {
    const windowMock: any = global.window;
    windowMock.umami = undefined;

    const module = await import('@/lib/analytics/tracking');
    const { trackEvent, isAnalyticsReady } = module;

    const trackSpy = vi.fn();

    expect(isAnalyticsReady()).toBe(false);

    trackEvent(ANALYTICS_EVENT, { step: 'location' });

    windowMock.umami = { track: trackSpy };

    await vi.advanceTimersByTimeAsync(200);

    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith(ANALYTICS_EVENT, { step: 'location' });
    expect(isAnalyticsReady()).toBe(true);
  });

  it('sanitizes PII before sending events', async () => {
    const hashedModule = await import('@/lib/analytics/sanitize');
    const expectedEmailHash = hashedModule.hashForAnalytics('user@example.com');
    const expectedUserHash = hashedModule.hashForAnalytics('abcd-1234');

    const trackSpy = vi.fn();
    const windowMock: any = global.window;
    windowMock.umami = { track: trackSpy };

    const { trackEvent } = await import('@/lib/analytics/tracking');

    trackEvent(ANALYTICS_EVENT, {
      email: 'user@example.com',
      userId: 'abcd-1234',
      step: 'preferences',
    });

    expect(trackSpy).toHaveBeenCalledTimes(1);
    const [, properties] = trackSpy.mock.calls[0];
    expect(properties).toMatchObject({
      step: 'preferences',
      email_hash: expectedEmailHash,
      userId_hash: expectedUserHash,
    });
    expect(properties).not.toHaveProperty('email');
    expect(properties).not.toHaveProperty('userId');
  });

  it('respects analytics feature flag', async () => {
    process.env.NEXT_PUBLIC_FEATURE_ANALYTICS = 'false';

    const trackSpy = vi.fn();
    const windowMock: any = global.window;
    windowMock.umami = { track: trackSpy };

    const { trackEvent } = await import('@/lib/analytics/tracking');

    trackEvent(ANALYTICS_EVENT, { step: 'intake' });

    await vi.advanceTimersByTimeAsync(100);

    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('tracks page views when Umami is available', async () => {
    const trackSpy = vi.fn();
    const windowMock: any = global.window;
    windowMock.location = { pathname: '/profile', search: '?tab=alerts' };
    windowMock.umami = { track: trackSpy };

    const { trackPageView } = await import('@/lib/analytics/tracking');

    trackPageView();

    expect(trackSpy).toHaveBeenCalledWith('pageview', { url: '/profile?tab=alerts' });
  });
});


