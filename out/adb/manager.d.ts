import type { Device } from '../types';
export declare class AdbManager {
    private adbPath;
    private logcatProcess;
    private deviceId;
    constructor(adbPath: string);
    setAdbPath(path: string): void;
    /** 执行 adb 命令，返回 stdout */
    exec(args: string[], deviceId?: string | null): Promise<string>;
    /** 列出设备 adb devices -l */
    listDevices(): Promise<Device[]>;
    /** 根据包名获取 PID：adb shell pidof <package> */
    pidof(packageName: string): Promise<number[]>;
    setDevice(deviceId: string | null): void;
    getDevice(): string | null;
    /**
     * 启动 logcat 子进程，以流式输出。
     * 命令: adb [-s device] logcat -v threadtime
     * @param onExit 进程异常退出时调用（用于断连自动重试），主动 stopLogcat 不会调用
     */
    startLogcat(onLine: (line: string) => void, onError: (err: Error) => void, onExit?: () => void): void;
    stopLogcat(): void;
    /** 清空设备 logcat 缓冲区 */
    clearLogcat(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map