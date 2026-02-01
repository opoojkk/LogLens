import * as vscode from 'vscode';
import type { AdbManager } from '../adb/manager';
export declare class LogcatViewProvider {
    private readonly _extensionUri;
    private _panel?;
    private entries;
    private filteredEntries;
    private currentFilter;
    private paused;
    private maxLines;
    private adb;
    private presets;
    private deviceId;
    private packageName;
    private pidsFromPackage;
    private indexCounter;
    private refreshPidInterval;
    constructor(_extensionUri: vscode.Uri, adb: AdbManager);
    setMaxLines(n: number): void;
    setAdb(adb: AdbManager): void;
    /** 作为 Panel 打开（主入口） */
    createOrShowPanel(): Promise<void>;
    private getWebview;
    private getHtml;
    private setupMessageHandler;
    private postMessage;
    private applyFilter;
    private sendState;
    private sendEntries;
    private doRefreshDevices;
    private refreshPids;
    private startPidRefreshLoop;
    private copyEntries;
    /** 请求 Webview 发送当前选中行，用于 Command Palette 复制 */
    requestCopySelected(): void;
    /** 应用已保存的筛选预设（Command Palette 或 Webview 调用） */
    applyPreset(id: string): Promise<void>;
    /** 供 Command Palette 调用：弹出预设列表后应用 */
    requestApplyPreset(): Promise<void>;
    /** 导出当前筛选结果到文件（Command Palette 或 Webview 调用） */
    exportToFile(): Promise<void>;
    /** 由 extension 调用：启动 logcat 并推送到 webview；isRetry 为 true 时仅重启进程不清空日志（adb 断连重试） */
    start(deviceId: string | null, isRetry?: boolean): Promise<void>;
    stop(): void;
    /** 供 Command Palette 调用 */
    setPaused(paused: boolean): void;
    clearView(): void;
    /** 供 Command Palette 调用：刷新设备列表 */
    refreshDevices(): Promise<void>;
}
//# sourceMappingURL=provider.d.ts.map