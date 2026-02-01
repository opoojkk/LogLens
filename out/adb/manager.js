"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdbManager = void 0;
const child_process_1 = require("child_process");
const THREADTIME = '-v';
const THREADTIME_VALUE = 'threadtime';
class AdbManager {
    constructor(adbPath) {
        this.logcatProcess = null;
        this.deviceId = null;
        this.adbPath = adbPath;
    }
    setAdbPath(path) {
        this.adbPath = path;
    }
    /** 执行 adb 命令，返回 stdout */
    async exec(args, deviceId) {
        const fullArgs = deviceId ? ['-s', deviceId, ...args] : args;
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)(this.adbPath, fullArgs, {
                shell: process.platform === 'win32',
            });
            let out = '';
            let err = '';
            proc.stdout?.on('data', (d) => { out += d.toString(); });
            proc.stderr?.on('data', (d) => { err += d.toString(); });
            proc.on('error', (e) => reject(e));
            proc.on('close', (code) => {
                if (code === 0)
                    resolve(out);
                else
                    reject(new Error(err || `adb exit ${code}`));
            });
        });
    }
    /** 列出设备 adb devices -l */
    async listDevices() {
        const out = await this.exec(['devices', '-l']);
        const lines = out.split('\n').filter(Boolean);
        const devices = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.trim().split(/\s+/);
            const id = parts[0];
            const status = parts[1] || 'unknown';
            let name;
            const model = line.match(/model:(\S+)/);
            if (model)
                name = model[1];
            devices.push({ id, status, name });
        }
        return devices;
    }
    /** 根据包名获取 PID：adb shell pidof <package> */
    async pidof(packageName) {
        const out = await this.exec(['shell', 'pidof', packageName], this.deviceId);
        const s = out.trim();
        if (!s)
            return [];
        return s.split(/\s+/).map((x) => parseInt(x, 10)).filter((n) => !isNaN(n));
    }
    setDevice(deviceId) {
        this.deviceId = deviceId;
    }
    getDevice() {
        return this.deviceId;
    }
    /**
     * 启动 logcat 子进程，以流式输出。
     * 命令: adb [-s device] logcat -v threadtime
     * @param onExit 进程异常退出时调用（用于断连自动重试），主动 stopLogcat 不会调用
     */
    startLogcat(onLine, onError, onExit) {
        this.stopLogcat();
        const args = this.deviceId
            ? ['-s', this.deviceId, 'logcat', THREADTIME, THREADTIME_VALUE]
            : ['logcat', THREADTIME, THREADTIME_VALUE];
        const proc = (0, child_process_1.spawn)(this.adbPath, args, {
            shell: process.platform === 'win32',
        });
        this.logcatProcess = proc;
        let buffer = '';
        proc.stdout?.on('data', (data) => {
            buffer += data.toString();
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (line.trim())
                    onLine(line);
            }
        });
        proc.stderr?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg)
                onError(new Error(msg));
        });
        proc.on('error', (e) => onError(e));
        proc.on('close', (code, signal) => {
            this.logcatProcess = null;
            if (code !== 0 && code !== null && signal !== 'SIGTERM') {
                onError(new Error(`logcat exited ${code}`));
                onExit?.();
            }
        });
    }
    stopLogcat() {
        if (this.logcatProcess) {
            this.logcatProcess.kill('SIGTERM');
            this.logcatProcess = null;
        }
    }
    /** 清空设备 logcat 缓冲区 */
    async clearLogcat() {
        await this.exec(['logcat', '-c'], this.deviceId);
    }
}
exports.AdbManager = AdbManager;
//# sourceMappingURL=manager.js.map