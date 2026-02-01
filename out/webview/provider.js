"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogcatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const parser_1 = require("../parser");
const engine_1 = require("../filter/engine");
const presetStorage_1 = require("../filter/presetStorage");
const VIEW_TYPE = 'androidLogcat';
class LogcatViewProvider {
    constructor(_extensionUri, adb) {
        this._extensionUri = _extensionUri;
        this.entries = [];
        this.filteredEntries = [];
        this.currentFilter = null;
        this.paused = false;
        this.maxLines = 100000;
        this.presets = [];
        this.deviceId = null;
        this.packageName = null;
        this.pidsFromPackage = [];
        this.indexCounter = 0;
        this.refreshPidInterval = null;
        this.adb = adb;
    }
    setMaxLines(n) {
        this.maxLines = n;
    }
    setAdb(adb) {
        this.adb = adb;
    }
    /** 作为 Panel 打开（主入口） */
    async createOrShowPanel() {
        const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
        if (this._panel) {
            this._panel.reveal(column);
            return;
        }
        this._panel = vscode.window.createWebviewPanel(VIEW_TYPE, 'LogLens', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [this._extensionUri],
        });
        this._panel.webview.html = this.getHtml(this._panel.webview);
        this.setupMessageHandler(this._panel.webview);
        this.sendState();
        this._panel.onDidDispose(() => {
            this._panel = undefined;
        });
    }
    getWebview() {
        return this._panel?.webview;
    }
    getHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
    }
    setupMessageHandler(webview) {
        webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'setFilter':
                    this.currentFilter = msg.condition;
                    this.applyFilter();
                    this.sendEntries();
                    break;
                case 'setPaused':
                    this.paused = msg.paused;
                    this.postMessage({ type: 'paused', paused: this.paused });
                    break;
                case 'clear':
                    this.entries = [];
                    this.filteredEntries = [];
                    this.indexCounter = 0;
                    this.postMessage({ type: 'clear' });
                    break;
                case 'copy':
                    await this.copyEntries(msg.indices);
                    break;
                case 'export':
                    await this.exportToFile();
                    break;
                case 'refreshDevices':
                    await this.doRefreshDevices();
                    break;
                case 'selectDevice':
                    this.deviceId = msg.deviceId;
                    this.adb.setDevice(this.deviceId);
                    await this.doRefreshDevices();
                    if (this.packageName)
                        await this.refreshPids();
                    break;
                case 'setPackage':
                    this.packageName = msg.packageName;
                    await this.refreshPids();
                    this.startPidRefreshLoop();
                    this.applyFilter();
                    this.sendEntries();
                    break;
                case 'setFilterTag':
                    this.currentFilter = { ...(this.currentFilter ?? {}), tagInclude: msg.tag };
                    this.applyFilter();
                    this.sendEntries();
                    break;
                case 'setFilterPid':
                    this.currentFilter = { ...(this.currentFilter ?? {}), pids: [msg.pid] };
                    this.applyFilter();
                    this.sendEntries();
                    break;
                case 'copyText':
                    await vscode.env.clipboard.writeText(msg.text);
                    break;
                case 'savePreset':
                    await (0, presetStorage_1.addOrUpdatePreset)(msg.preset);
                    this.presets = await (0, presetStorage_1.loadPresets)();
                    this.postMessage({ type: 'filterPresets', presets: this.presets });
                    break;
                case 'deletePreset':
                    await (0, presetStorage_1.deletePreset)(msg.id);
                    this.presets = await (0, presetStorage_1.loadPresets)();
                    this.postMessage({ type: 'filterPresets', presets: this.presets });
                    break;
                case 'applyPreset':
                    const preset = this.presets.find((p) => p.id === msg.id);
                    if (preset) {
                        this.currentFilter = { ...preset.condition };
                        this.applyFilter();
                        this.sendEntries();
                    }
                    break;
                default:
                    break;
            }
        });
    }
    postMessage(msg) {
        this.getWebview()?.postMessage(msg);
    }
    applyFilter() {
        let cond = this.currentFilter ? { ...this.currentFilter } : null;
        if (this.packageName && this.pidsFromPackage.length) {
            cond = cond ?? {};
            cond.pids = [...(cond.pids ?? []), ...this.pidsFromPackage];
        }
        this.filteredEntries = this.entries.filter((e) => (0, engine_1.matchesFilter)(e, cond));
    }
    sendState() {
        this.postMessage({ type: 'paused', paused: this.paused });
        this.postMessage({ type: 'filterPresets', presets: this.presets });
    }
    sendEntries() {
        this.postMessage({ type: 'clear' });
        this.postMessage({ type: 'log', entries: this.filteredEntries, replace: true });
    }
    async doRefreshDevices() {
        try {
            const devices = await this.adb.listDevices();
            this.postMessage({ type: 'devices', devices });
        }
        catch (e) {
            this.postMessage({ type: 'error', message: e.message });
        }
    }
    async refreshPids() {
        if (!this.packageName) {
            this.pidsFromPackage = [];
            return;
        }
        try {
            this.pidsFromPackage = await this.adb.pidof(this.packageName);
        }
        catch {
            this.pidsFromPackage = [];
        }
    }
    startPidRefreshLoop() {
        if (this.refreshPidInterval)
            clearInterval(this.refreshPidInterval);
        if (!this.packageName)
            return;
        this.refreshPidInterval = setInterval(() => {
            this.refreshPids().then(() => {
                this.applyFilter();
                this.sendEntries();
            });
        }, 2000);
    }
    async copyEntries(indices) {
        const set = new Set(indices);
        const lines = this.filteredEntries
            .filter((e) => set.has(e.index))
            .map((e) => e.raw)
            .join('\n');
        await vscode.env.clipboard.writeText(lines);
    }
    /** 请求 Webview 发送当前选中行，用于 Command Palette 复制 */
    requestCopySelected() {
        this.postMessage({ type: 'requestCopy' });
    }
    /** 应用已保存的筛选预设（Command Palette 或 Webview 调用） */
    async applyPreset(id) {
        const preset = this.presets.find((p) => p.id === id);
        if (preset) {
            this.currentFilter = { ...preset.condition };
            this.applyFilter();
            this.sendEntries();
        }
    }
    /** 供 Command Palette 调用：弹出预设列表后应用 */
    async requestApplyPreset() {
        if (!this.presets.length) {
            const presets = await (0, presetStorage_1.loadPresets)();
            this.presets = presets;
        }
        if (!this.presets.length) {
            vscode.window.showInformationMessage('暂无筛选预设，请在 LogLens 面板中创建。');
            return;
        }
        const picked = await vscode.window.showQuickPick(this.presets.map((p) => ({ label: p.name, presetId: p.id })), { placeHolder: '选择筛选预设' });
        if (picked)
            await this.applyPreset(picked.presetId);
    }
    /** 导出当前筛选结果到文件（Command Palette 或 Webview 调用） */
    async exportToFile() {
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('logcat.txt'),
            filters: { 'Text': ['txt'], 'All': ['*'] },
        });
        if (!uri)
            return;
        const content = this.filteredEntries.map((e) => e.raw).join('\n');
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    }
    /** 由 extension 调用：启动 logcat 并推送到 webview；isRetry 为 true 时仅重启进程不清空日志（adb 断连重试） */
    async start(deviceId, isRetry = false) {
        this.deviceId = deviceId;
        this.adb.setDevice(deviceId);
        if (!isRetry) {
            this.presets = await (0, presetStorage_1.loadPresets)();
            this.postMessage({ type: 'filterPresets', presets: this.presets });
            await this.doRefreshDevices();
            this.entries = [];
            this.filteredEntries = [];
            this.indexCounter = 0;
            this.applyFilter();
            this.postMessage({ type: 'clear' });
        }
        this.adb.startLogcat((line) => {
            if (this.paused)
                return;
            const entry = (0, parser_1.parseLogLine)(line, this.indexCounter++);
            if (entry) {
                this.entries.push(entry);
                if (this.entries.length > this.maxLines)
                    this.entries.shift();
                if ((0, engine_1.matchesFilter)(entry, this.currentFilter)) {
                    this.filteredEntries.push(entry);
                    if (this.filteredEntries.length > this.maxLines)
                        this.filteredEntries.shift();
                    this.postMessage({ type: 'log', entries: [entry] });
                }
            }
        }, (err) => {
            this.postMessage({ type: 'error', message: err.message });
        }, () => {
            this.postMessage({ type: 'error', message: 'logcat 已断开，2 秒后重试…' });
            setTimeout(() => {
                if (this._panel && this.deviceId)
                    this.start(this.deviceId, true);
            }, 2000);
        });
    }
    stop() {
        if (this.refreshPidInterval) {
            clearInterval(this.refreshPidInterval);
            this.refreshPidInterval = null;
        }
        this.adb.stopLogcat();
    }
    /** 供 Command Palette 调用 */
    setPaused(paused) {
        this.paused = paused;
        this.postMessage({ type: 'paused', paused: this.paused });
    }
    clearView() {
        this.entries = [];
        this.filteredEntries = [];
        this.indexCounter = 0;
        this.postMessage({ type: 'clear' });
    }
    /** 供 Command Palette 调用：刷新设备列表 */
    async refreshDevices() {
        await this.doRefreshDevices();
    }
}
exports.LogcatViewProvider = LogcatViewProvider;
//# sourceMappingURL=provider.js.map