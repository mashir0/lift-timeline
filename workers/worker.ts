// Custom worker: OpenNext の fetch に加え、Cron 用の scheduled ハンドラーを追加する
import { default as handler } from "../.open-next/worker.js";
import { updateAllLiftStatuses } from "../src/lib/scheduledTasks";
import { deleteExpiredCacheKeys } from "../src/lib/liftTimelineCache";
import type { R2BucketLike } from "../src/lib/liftTimelineCache";

/** CRON 実行時に Worker env として渡される値（NEXT_PUBLIC_ 接頭辞は使わない） */
interface CronEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  YUKIYAMA_API?: string;
  REFERENCE_DATE?: string;
  LIFT_TIMELINE_CACHE_R2_BUCKET?: R2BucketLike;
}

const worker = {
  fetch: handler.fetch,
  async scheduled(
    _event: unknown,
    env: CronEnv,
    ctx: { waitUntil: (p: Promise<unknown>) => void }
  ) {
    ctx.waitUntil(updateAllLiftStatuses());
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
