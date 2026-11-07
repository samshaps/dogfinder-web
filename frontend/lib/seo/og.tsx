import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

/**
 * Shared Open Graph card for /adopt pages. Pure JSX, no remote fonts, so it
 * renders quickly inside the image route handlers.
 */
export function renderAdoptOgImage(opts: { eyebrow: string; title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 60%)',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            DY
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>DogYenta</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 28, color: '#2563eb', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2 }}>
            {opts.eyebrow}
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{opts.title}</div>
          <div style={{ fontSize: 32, color: '#475569', maxWidth: 1000 }}>{opts.subtitle}</div>
        </div>
        <div style={{ fontSize: 24, color: '#64748b' }}>AI-powered rescue dog matching · dogyenta.com</div>
      </div>
    ),
    OG_SIZE,
  );
}
