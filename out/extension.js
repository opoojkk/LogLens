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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const manager_1 = require("./adb/manager");
const provider_1 = require("./webview/provider");
let provider;
let adb;
function activate(context) {
    const config = vscode.workspace.getConfiguration('androidLogcat');
    const adbPath = config.get('adbPath') ?? 'adb';
    const maxLines = config.get('maxLogLines') ?? 100000;
    adb = new manager_1.AdbManager(adbPath);
    provider = new provider_1.LogcatViewProvider(context.extensionUri, adb);
    provider.setMaxLines(maxLines);
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.start', async () => {
        let deviceId = null;
        try {
            const devices = await adb.listDevices();
            const connected = devices.filter((d) => d.status === 'device');
            if (connected.length === 0) {
                vscode.window.showErrorMessage('未检测到已连接的 Android 设备，请连接设备并启用 USB 调试。');
                return;
            }
            if (connected.length === 1) {
                deviceId = connected[0].id;
            }
            else {
                const items = connected.map((d) => ({
                    label: d.name ? `${d.name} (${d.id})` : d.id,
                    deviceId: d.id,
                }));
                const picked = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择设备',
                    title: 'LogLens: 选择设备',
                });
                if (!picked)
                    return;
                deviceId = picked.deviceId;
            }
            await provider.createOrShowPanel();
            await provider.start(deviceId);
        }
        catch (e) {
            const msg = e.message;
            vscode.window.showErrorMessage(`LogLens 启动失败: ${msg}`);
            if (msg.includes('ENOENT') || msg.includes('spawn')) {
                vscode.window.showInformationMessage('请确保已安装 adb 并已加入 PATH，或在设置中配置 LogLens 的 adbPath。');
            }
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.refreshDevices', async () => {
        await provider.createOrShowPanel();
        await provider.refreshDevices();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.pause', () => {
        provider.setPaused(true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.resume', () => {
        provider.setPaused(false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.clear', async () => {
        await adb.clearLogcat().catch(() => { });
        provider.clearView();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.copySelected', () => {
        provider.requestCopySelected();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.exportToFile', async () => {
        await provider.exportToFile();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('androidLogcat.applyFilterPreset', async () => {
        await provider.requestApplyPreset();
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('androidLogcat')) {
            const cfg = vscode.workspace.getConfiguration('androidLogcat');
            adb.setAdbPath(cfg.get('adbPath') ?? 'adb');
            provider.setMaxLines(cfg.get('maxLogLines') ?? 100000);
        }
    }));
}
function deactivate() {
    provider?.stop();
}
//# sourceMappingURL=extension.js.map