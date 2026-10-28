import "./globals.css";

export const metadata = {
  title: "DailyManager — Your day, in control",
  description: "A calmer, smarter workspace for your tasks, projects, notes and business.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}