// Custom worker: OpenNext の fetch に加え、Cron 用の scheduled ハンドラーを追加する
import { default as handler } from "../.open-next/worker.js";
import { updateAllLiftStatuses } from "../src/lib/scheduledTasks";

/** CRON 実行時に Supabase 等の環境変数を受け取るための型 */
interface CronEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

const worker = {
  fetch: handler.fetch,
  async scheduled(
    _event: unknown,
    env: CronEnv,
    ctx: { waitUntil: (p: Promise<unknown>) => void }
  ) {
    ctx.waitUntil(updateAllLiftStatuses(env));
  },
};

export default worker;
