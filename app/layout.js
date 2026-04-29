export const metadata = {
  title: 'GastoQR Pro',
  description: 'Control de gastos con QR',
  manifest: '/manifest.json',
  themeColor: '#070707',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GastoQR' },
  icons: { apple: '/icon-512.png', icon: [{ url: '/icon-192.png', sizes: '192x192' }, { url: '/icon-512.png', sizes: '512x512' }] }
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
