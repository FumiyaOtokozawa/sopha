import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // ログイン処理
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        switch (authError.message) {
          case "Invalid login credentials":
            setError("メールアドレスまたはパスワードが正しくありません");
            return;
          case "Email not confirmed":
            setError(
              "メールアドレスの確認が完了していません。確認メールのリンクをクリックしてください。"
            );
            return;
          default:
            setError(
              "ログインに失敗しました。しばらく時間をおいて再度お試しください。"
            );
            return;
        }
      }

      // ログイン回数を更新
      const { data: userData, error: userError } = await supabase
        .from("USER_INFO")
        .select("emp_no, login_count")
        .eq("email", email)
        .single();

      if (userError) {
        setError(
          "ユーザー情報の取得に失敗しました。管理者にお問い合わせください。"
        );
        return;
      }

      // login_countを+1
      const { error: updateError } = await supabase
        .from("USER_INFO")
        .update({ login_count: (userData.login_count || 0) + 1 })
        .eq("emp_no", userData.emp_no);

      if (updateError) throw updateError;

      // ロール判定して遷移先を決定
      const { data: roleData, error: roleError } = await supabase
        .from("USER_ROLE")
        .select("role")
        .eq("emp_no", userData.emp_no)
        .single();

      if (roleError) {
        setError(
          "ユーザー権限の取得に失敗しました。管理者にお問い合わせください。"
        );
        return;
      }

      // 遷移先のパスを事前に決定
      const path =
        roleData.role === "1"
          ? "/adminPages/admMainPage"
          : "/employeePages/empMainPage";

      // 次の画面を事前に読み込み開始
      router.prefetch(path);

      // 成功アニメーションの開始
      setIsSuccess(true);
      setIsExiting(true);

      // アニメーション完了と同時に遷移
      setTimeout(() => {
        router.push(path);
      }, 1800); // ロゴアニメーションの時間に合わせて調整
    } catch (error) {
      console.error("ログインエラー:", error);
      setError(
        "予期せぬエラーが発生しました。しばらく時間をおいて再度お試しください。"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push("/registerPages/tempRegistPage");
    }, 400); // 遷移時間を短縮
  };

  const handleResetClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      router.push("/resetPassword");
    }, 400); // 遷移時間を短縮
  };

  // 共通の入力欄スタイル
  const inputClassName = `
    w-full p-3 rounded-lg
    bg-[rgb(207,216,220,0.25)] text-[rgb(55,55,63)] placeholder-[rgb(55,55,63,0.5)]
    focus:outline-none focus:ring-2 focus:ring-[rgb(91,99,211)]
    focus:bg-[rgb(252,252,252)]
    [&:not(:placeholder-shown)]:bg-[rgb(252,252,252)]
    transition-all duration-200
    border border-transparent hover:border-[rgb(91,99,211,0.5)]
  `;

  // フレームのアニメーション設定
  const frameVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      backgroundColor: "rgba(252, 252, 252, 0)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      backgroundColor: "rgba(252, 252, 252, 0.1)",
      transition: {
        duration: 0.8,
        ease: [0.23, 1, 0.32, 1],
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  };

  // ロゴのアニメーション設定
  const logoVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2,
        ease: [0.23, 1, 0.32, 1],
      },
    },
    success: {
      scale: [1, 1.4],
      opacity: [1, 0],
      transition: {
        duration: 1.6,
        ease: "easeInOut",
        times: [0, 1],
      },
    },
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login-container"
        className="fixed inset-0 flex items-center justify-center overflow-hidden touch-none"
        initial={{
          opacity: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 100%)",
        }}
        animate={{
          opacity: 1,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.5) 100%)",
        }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
        }}
      >
        <motion.div
          key="login-form"
          variants={frameVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="backdrop-blur-md rounded-2xl shadow-2xl p-8 w-[360px] border border-[rgba(255,255,255,0.12)] relative overflow-hidden"
        >
          <motion.div
            key="logo-container"
            className="flex flex-col items-center mb-2"
            variants={logoVariants}
            initial="initial"
            animate={isSuccess ? "success" : "animate"}
          >
            <div className="w-64 h-48 relative">
              <Image
                src="/logo_vertical.svg"
                alt="SOPHA Logo"
                layout="fill"
                objectFit="contain"
                priority
              />
            </div>
          </motion.div>

          {/* Success Message */}
          {isSuccess && (
            <motion.div
              key="success-message"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.6,
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              <motion.div
                className="text-[rgb(252,252,252)] text-2xl font-bold"
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  times: [0, 0.5, 1],
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              >
                ログイン成功！
              </motion.div>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="mb-6 p-3 bg-[rgba(255,0,0,0.1)] border border-[rgba(255,0,0,0.25)] rounded-lg"
            >
              <p className="text-[rgb(248,113,113)] text-sm text-center">
                {error}
              </p>
            </motion.div>
          )}

          <motion.form
            key="login-form-fields"
            onSubmit={handleLogin}
            className="space-y-5"
            autoComplete="off"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{
              duration: 0.6,
              delay: 0.2,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              visibility: isSuccess ? "hidden" : "visible",
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[rgba(252,252,252,0.5)] text-sm block ml-1"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sopha@comsize.com"
                className={inputClassName}
                required
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-[rgba(252,252,252,0.5)] text-sm block ml-1"
              >
                パスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClassName}
                required
                autoComplete="current-password"
              />
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="
                w-full py-3 rounded-lg
                bg-[rgb(91,99,211)] text-[rgb(252,252,252)] font-semibold
                hover:bg-[rgb(73,81,197)] transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-[rgba(91,99,211,0.12)]
                mt-8
              "
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </motion.button>
          </motion.form>

          <motion.div
            key="additional-links"
            className="mt-6 flex flex-col items-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExiting ? 0 : 1 }}
            transition={{
              duration: 0.6,
              delay: 0.3,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              visibility: isSuccess ? "hidden" : "visible",
            }}
          >
            <motion.button
              onClick={handleRegisterClick}
              className="text-[rgba(252,252,252,0.5)] hover:text-[rgb(91,99,211)] text-sm transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              アカウントをお持ちでない方はこちら
            </motion.button>
            <motion.button
              onClick={handleResetClick}
              className="text-[rgba(252,252,252,0.5)] hover:text-[rgb(91,99,211)] text-sm transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              パスワードをお忘れの方はこちら
            </motion.button>
          </motion.div>

          {/* Success Particles */}
          {isSuccess && (
            <motion.div
              key="success-particles"
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-[rgb(252,252,252)] rounded-full"
                  initial={{
                    x: "50%",
                    y: "50%",
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    x: `${50 + (Math.random() - 0.5) * 60}%`,
                    y: `${50 + (Math.random() - 0.5) * 60}%`,
                    scale: [0, 1, 0.8],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginPage;
