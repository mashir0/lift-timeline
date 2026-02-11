// Custom worker: OpenNext の fetch に加え、Cron 用の scheduled ハンドラーを追加する
import { default as handler } from "../.open-next/worker.js";
import { updateAllLiftStatuses } from "../src/lib/scheduledTasks";
import { deleteExpiredCacheKeys } from "../src/lib/liftTimelineCache";
import type { R2BucketLike } from "../src/lib/liftTimelineCache";

/** CRON 実行時に Supabase / Yukiyama API / R2 等を受け取るための型 */
interface CronEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_YUKIYAMA_API?: string;
  LIFT_TIMELINE_CACHE_R2_BUCKET?: R2BucketLike;
}

const worker = {
  fetch: handler.fetch,
  async scheduled(
    _event: unknown,
    env: CronEnv,
    ctx: { waitUntil: (p: Promise<unknown>) => void }
  ) {
    ctx.waitUntil(updateAllLiftStatuses(env));
    if (env.LIFT_TIMELINE_CACHE_R2_BUCKET) {
      ctx.waitUntil(
        deleteExpiredCacheKeys(env.LIFT_TIMELINE_CACHE_R2_BUCKET).then((deleted) => {
          if (deleted > 0) {
            console.log(`[Cron] 期限切れ lift-timeline キャッシュ削除: ${deleted} 件`);
          }
        })
      );
    }
  },
};

export default worker;
