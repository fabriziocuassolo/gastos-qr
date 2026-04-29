export const metadata = {
  title: "Kuento",
  description: "Control inteligente de gastos con QR",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png"
  },
  themeColor: "#1A2F3C"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
