import type { LogEntry, FilterCondition } from '../types';
/**
 * 单条日志是否满足筛选条件（条件之间 AND）。
 */
export declare function matchesFilter(entry: LogEntry, condition: FilterCondition | null): boolean;
/**
 * 批量筛选日志。
 */
export declare function filterEntries(entries: LogEntry[], condition: FilterCondition | null): LogEntry[];
//# sourceMappingURL=engine.d.ts.map