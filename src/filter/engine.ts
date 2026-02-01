import type { LogEntry, FilterCondition, LogLevel } from '../types';

const LEVEL_ORDER: Record<LogLevel, number> = {
  V: 0, D: 1, I: 2, W: 3, E: 4, F: 5, S: 6,
};

function levelMatches(entry: LogEntry, levels: LogLevel[]): boolean {
  if (!levels.length) return true;
  return levels.includes(entry.level);
}

function tagIncludeMatches(entry: LogEntry, sub: string): boolean {
  if (!sub.trim()) return true;
  return entry.tag.includes(sub);
}

function tagExcludeMatches(entry: LogEntry, sub: string): boolean {
  if (!sub.trim()) return true;
  return !entry.tag.includes(sub);
}

function pidsMatches(entry: LogEntry, pids: number[]): boolean {
  if (!pids.length) return true;
  return pids.includes(entry.pid);
}

function textMatches(entry: LogEntry, text: string): boolean {
  if (!text.trim()) return true;
  const lower = text.toLowerCase();
  return (
    entry.message.toLowerCase().includes(lower) ||
    entry.tag.toLowerCase().includes(lower) ||
    entry.raw.toLowerCase().includes(lower)
  );
}

function regexMatches(entry: LogEntry, pattern: string): boolean {
  if (!pattern.trim()) return true;
  try {
    const re = new RegExp(pattern);
    return re.test(entry.raw) || re.test(entry.message);
  } catch {
    return true;
  }
}

/**
 * 单条日志是否满足筛选条件（条件之间 AND）。
 */
export function matchesFilter(entry: LogEntry, condition: FilterCondition | null): boolean {
  if (!condition) return true;
  if (!levelMatches(entry, condition.levels ?? [])) return false;
  if (!tagIncludeMatches(entry, condition.tagInclude ?? '')) return false;
  if (!tagExcludeMatches(entry, condition.tagExclude ?? '')) return false;
  if (!pidsMatches(entry, condition.pids ?? [])) return false;
  if (!textMatches(entry, condition.text ?? '')) return false;
  if (!regexMatches(entry, condition.regex ?? '')) return false;
  return true;
}

/**
 * 批量筛选日志。
 */
export function filterEntries(entries: LogEntry[], condition: FilterCondition | null): LogEntry[] {
  if (!condition) return entries;
  return entries.filter((e) => matchesFilter(e, condition));
}
