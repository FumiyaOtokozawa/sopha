import { useRouter } from "next/router";

const RegistCompletePage = () => {
  const router = useRouter();
  const { email } = router.query;

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="bg-[#FCFCFC19] rounded-lg shadow-md p-8 w-[400px] mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#FCFCFC]">
          仮登録完了
        </h1>
        
        <p className="text-[#FCFCFC] text-center mb-6">
          {email}宛に確認メールを送信しました。<br />
          メール内のリンクをクリックして、本登録を完了してください。
        </p>

        <button
          onClick={() => router.push("/loginPage")}
          className="
            w-full py-2 rounded-md
            bg-[#5b63d3] text-white font-semibold
            hover:bg-opacity-90 transition-colors
          "
        >
          ログインページへ
        </button>
      </div>
    </div>
  );
};

export default RegistCompletePage; 