// pages/_app.tsx
import "../styles/global.css";
import type { AppProps } from "next/app";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
