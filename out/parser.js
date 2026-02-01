"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLogLine = parseLogLine;
exports.parseLogLines = parseLogLines;
/**
 * 解析 adb logcat -v threadtime 输出。
 * 格式: MM-DD HH:mm:ss.mmm  PID   TID LEVEL Tag: Message
 * 例如: 03-05 18:42:11.123  1234  5678 D ActivityManager: Start proc...
 */
const THREADTIME_REGEX = /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEFS])\s+(\S+?):\s*(.*)$/;
const LEVEL_MAP = {
    V: 'V', D: 'D', I: 'I', W: 'W', E: 'E', F: 'F', S: 'S',
};
function parseLogLine(raw, index) {
    const m = raw.match(THREADTIME_REGEX);
    if (!m)
        return null;
    const [, time, pidStr, tidStr, levelStr, tag, message] = m;
    const level = LEVEL_MAP[levelStr] ?? 'D';
    return {
        raw,
        time: time.trim(),
        pid: parseInt(pidStr, 10),
        tid: parseInt(tidStr, 10),
        level,
        tag: tag,
        message: message ?? '',
        index,
    };
}
/** 批量解析，跳过无法识别的行（如 continuation） */
function parseLogLines(lines, startIndex) {
    const entries = [];
    for (let i = 0; i < lines.length; i++) {
        const e = parseLogLine(lines[i], startIndex + i);
        if (e)
            entries.push(e);
    }
    return entries;
}
//# sourceMappingURL=parser.js.map