// pages/_app.tsx
import "../styles/global.css";
import type { AppProps } from "next/app";

function SOPHA({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default SOPHA;
