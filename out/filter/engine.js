"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesFilter = matchesFilter;
exports.filterEntries = filterEntries;
const LEVEL_ORDER = {
    V: 0, D: 1, I: 2, W: 3, E: 4, F: 5, S: 6,
};
function levelMatches(entry, levels) {
    if (!levels.length)
        return true;
    return levels.includes(entry.level);
}
function tagIncludeMatches(entry, sub) {
    if (!sub.trim())
        return true;
    return entry.tag.includes(sub);
}
function tagExcludeMatches(entry, sub) {
    if (!sub.trim())
        return true;
    return !entry.tag.includes(sub);
}
function pidsMatches(entry, pids) {
    if (!pids.length)
        return true;
    return pids.includes(entry.pid);
}
function textMatches(entry, text) {
    if (!text.trim())
        return true;
    const lower = text.toLowerCase();
    return (entry.message.toLowerCase().includes(lower) ||
        entry.tag.toLowerCase().includes(lower) ||
        entry.raw.toLowerCase().includes(lower));
}
function regexMatches(entry, pattern) {
    if (!pattern.trim())
        return true;
    try {
        const re = new RegExp(pattern);
        return re.test(entry.raw) || re.test(entry.message);
    }
    catch {
        return true;
    }
}
/**
 * 单条日志是否满足筛选条件（条件之间 AND）。
 */
function matchesFilter(entry, condition) {
    if (!condition)
        return true;
    if (!levelMatches(entry, condition.levels ?? []))
        return false;
    if (!tagIncludeMatches(entry, condition.tagInclude ?? ''))
        return false;
    if (!tagExcludeMatches(entry, condition.tagExclude ?? ''))
        return false;
    if (!pidsMatches(entry, condition.pids ?? []))
        return false;
    if (!textMatches(entry, condition.text ?? ''))
        return false;
    if (!regexMatches(entry, condition.regex ?? ''))
        return false;
    return true;
}
/**
 * 批量筛选日志。
 */
function filterEntries(entries, condition) {
    if (!condition)
        return entries;
    return entries.filter((e) => matchesFilter(e, condition));
}
//# sourceMappingURL=engine.js.map