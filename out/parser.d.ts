import type { LogEntry } from './types';
export declare function parseLogLine(raw: string, index: number): LogEntry | null;
/** 批量解析，跳过无法识别的行（如 continuation） */
export declare function parseLogLines(lines: string[], startIndex: number): LogEntry[];
//# sourceMappingURL=parser.d.ts.map