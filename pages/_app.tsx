// pages/_app.tsx
import "../styles/global.css";
import type { AppProps } from "next/app";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PWAInstallPrompt from "../components/PWAInstallPrompt";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <PWAInstallPrompt />
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
