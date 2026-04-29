export const metadata = {
  title: "GastoQR",
  description: "Control de gastos con QR",
  manifest: "/manifest.json",
  themeColor: "#ff6b2b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GastoQR"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
