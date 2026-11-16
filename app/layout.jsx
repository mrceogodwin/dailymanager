import "./globals.css";
import OfflineStatus from "./offline-status";

export const metadata = {
  title: "DailyManager — Your day, in control",
  description: "A calmer, smarter workspace for your tasks, projects, notes and business.",
  manifest: "/manifest.json",
  applicationName: "DailyManager",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DailyManager" },
  icons: { icon: "/icons/dailymanager.svg", apple: "/icons/dailymanager.svg" },
};

export const viewport = {
  themeColor: "#0b0c0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}<OfflineStatus /></body>
    </html>
  );
}
