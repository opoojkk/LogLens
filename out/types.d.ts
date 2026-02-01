/**
 * Android Logcat 日志条目（threadtime 格式）
 * 示例: 03-05 18:42:11.123  1234  5678 D ActivityManager: Start proc...
 */
export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F' | 'S';
export interface LogEntry {
    /** 原始行（便于复制/导出） */
    raw: string;
    /** 日期时间 03-05 18:42:11.123 */
    time: string;
    pid: number;
    tid: number;
    level: LogLevel;
    tag: string;
    message: string;
    /** 行号（用于虚拟列表 key） */
    index: number;
}
/** 设备信息 */
export interface Device {
    id: string;
    status: string;
    /** 友好名称，如 "Pixel 6" */
    name?: string;
}
/** 筛选条件（AND 组合，单条件内可 OR） */
export interface FilterCondition {
    levels?: LogLevel[];
    tagInclude?: string;
    tagExclude?: string;
    pids?: number[];
    packageName?: string;
    text?: string;
    regex?: string;
}
/** 保存的 Filter Preset */
export interface FilterPreset {
    id: string;
    name: string;
    enabled: boolean;
    condition: FilterCondition;
}
/** Webview 与 Extension 消息协议 */
export type WebviewMessage = {
    type: 'log';
    entries: LogEntry[];
    replace?: boolean;
} | {
    type: 'clear';
} | {
    type: 'paused';
    paused: boolean;
} | {
    type: 'devices';
    devices: Device[];
} | {
    type: 'error';
    message: string;
} | {
    type: 'filterPresets';
    presets: FilterPreset[];
} | {
    type: 'requestCopy';
};
export type ExtensionMessage = {
    type: 'setFilter';
    condition: FilterCondition | null;
} | {
    type: 'setPaused';
    paused: boolean;
} | {
    type: 'clear';
} | {
    type: 'copy';
    indices: number[];
} | {
    type: 'copyText';
    text: string;
} | {
    type: 'export';
} | {
    type: 'refreshDevices';
} | {
    type: 'selectDevice';
    deviceId: string | null;
} | {
    type: 'setPackage';
    packageName: string | null;
} | {
    type: 'setFilterTag';
    tag: string;
} | {
    type: 'setFilterPid';
    pid: number;
} | {
    type: 'savePreset';
    preset: FilterPreset;
} | {
    type: 'deletePreset';
    id: string;
} | {
    type: 'applyPreset';
    id: string;
} | {
    type: 'search';
    query: string;
};
//# sourceMappingURL=types.d.ts.map