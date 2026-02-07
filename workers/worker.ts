// Custom worker: OpenNext の fetch に加え、Cron 用の scheduled ハンドラーを追加する
// @ts-expect-error .open-next/worker.js はビルド時に生成される
import { default as handler } from "../.open-next/worker.js";
import { updateAllLiftStatuses } from "../src/lib/scheduledTasks";

export default {
  fetch: handler.fetch,
  async scheduled(
    _event: ScheduledEvent,
    _env: unknown,
    ctx: ExecutionContext
  ) {
    ctx.waitUntil(updateAllLiftStatuses());
  },
};
