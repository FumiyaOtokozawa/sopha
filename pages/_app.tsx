// pages/_app.tsx
import "../styles/global.css";
import type { AppProps } from "next/app";
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/calendar.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";
import Header from "../components/Header";
import FooterMenu from "../components/FooterMenu";
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ログインが必要なパスのパターン
const AUTH_REQUIRED_PATHS = [
  '/employeePages',
  '/events',
  '/adminPages'
];

// 認証前のページのパスを定義
const publicPages = [
  '/loginPage',
  '/registerPages/registConfirmedPage',
  '/registerPages/registPage',
  '/registerPages/registInputPage'
  
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分間キャッシュを保持
      gcTime: 30 * 60 * 1000, // 30分間キャッシュを保持
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 現在のページが認証前のページかどうかを判定
  const isPublicPage = publicPages.includes(router.pathname);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ログインが必要なパスかどうかをチェック
  const isAuthRequired = AUTH_REQUIRED_PATHS.some(path => router.pathname.startsWith(path));

  // ログインが必要なパスにアクセスしているが、未ログインの場合はログインページにリダイレクト
  useEffect(() => {
    if (!isLoading && isAuthRequired && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthRequired, isAuthenticated, router]);

  if (isLoading) {
    return null; // またはローディング表示
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <meta name='viewport' content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' />
        <meta name='description' content='Sopha - スケジュール管理アプリケーション' />
      </Head>
      <div className="min-h-screen flex flex-col">
        {isAuthenticated && !isPublicPage && <Header />}
        {isPublicPage ? (
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
        ) : (
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
        )}
        {isAuthenticated && !isPublicPage && <FooterMenu />}
      </div>
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  );
}
