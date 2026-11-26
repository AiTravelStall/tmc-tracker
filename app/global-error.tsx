'use client';

// Last-resort boundary: no app CSS or fonts are guaranteed here, so keep it dependency-free.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, background: '#f2f4f6', color: '#000442' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 24, margin: '0 0 8px' }}>TMC Tracker is having trouble</h1>
          <p style={{ color: '#475569', margin: '0 0 16px' }}>Please try again in a moment.</p>
          <button onClick={reset} style={{ background: '#0e7fa6', color: '#fff', border: 0, borderRadius: 14, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
