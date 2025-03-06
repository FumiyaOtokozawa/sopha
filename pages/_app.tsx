// pages/_app.tsx
import "../styles/global.css";
import type { AppProps } from "next/app";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import Header from "../components/Header";
import FooterMenu from "../components/FooterMenu";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <>
      <PWAInstallPrompt />
      <div className="min-h-screen flex flex-col">
        <Header />
        <AnimatePresence mode="wait">
          <motion.main
            key={router.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            <Component {...pageProps} />
          </motion.main>
        </AnimatePresence>
        <FooterMenu />
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
