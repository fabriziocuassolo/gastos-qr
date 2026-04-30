export const metadata = {
  title: "Kuento",
  description: "Kuento - control de gastos con QR",
  manifest: "/manifest.json",
  themeColor: "#1A2F3C",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A2F3C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Kuento" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#1A2F3C', overflowX: 'hidden' }}>{children}</body>
    </html>
  );
}
