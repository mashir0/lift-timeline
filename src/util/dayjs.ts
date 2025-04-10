import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// プラグインを拡張
dayjs.extend(utc);
dayjs.extend(timezone);

export default dayjs;