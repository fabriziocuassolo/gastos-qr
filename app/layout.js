export const metadata = {
  title: 'GastoQR Pro',
  description: 'Control de gastos con QR, carga manual y nube',
  manifest: '/manifest.json',
  icons: { apple: '/icon-512.png' },
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
