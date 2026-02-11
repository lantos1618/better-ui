export const metadata = {
  title: 'Better UI - Persistence Example',
  description: 'Chat persistence with Drizzle + SQLite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0a0a0a', color: '#eee' }}>
        {children}
      </body>
    </html>
  );
}
