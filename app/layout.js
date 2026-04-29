export const metadata = {
  title: "Kuento",
  description: "Kuento - control de gastos con QR",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
