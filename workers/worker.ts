// Custom worker: OpenNext の fetch に加え、Cron 用の scheduled ハンドラーを追加する
import { default as handler } from "../.open-next/worker.js";
import { updateAllLiftStatuses } from "../src/lib/scheduledTasks";

export default {
  fetch: handler.fetch,
  async scheduled(
    _event: unknown, 
    _env: unknown, 
    ctx: { waitUntil: (p: Promise<unknown>) => void }
  ) {
    ctx.waitUntil(updateAllLiftStatuses());
  },
};
