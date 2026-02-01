import * as vscode from 'vscode';
import { AdbManager } from './adb/manager';
import { LogcatViewProvider } from './webview/provider';

let provider: LogcatViewProvider;
let adb: AdbManager;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('androidLogcat');
  const adbPath = config.get<string>('adbPath') ?? 'adb';
  const maxLines = config.get<number>('maxLogLines') ?? 100000;

  adb = new AdbManager(adbPath);
  provider = new LogcatViewProvider(context.extensionUri, adb);
  provider.setMaxLines(maxLines);

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.start', async () => {
      let deviceId: string | null = null;
      try {
        const devices = await adb.listDevices();
        const connected = devices.filter((d) => d.status === 'device');
        if (connected.length === 0) {
          vscode.window.showErrorMessage('未检测到已连接的 Android 设备，请连接设备并启用 USB 调试。');
          return;
        }
        if (connected.length === 1) {
          deviceId = connected[0].id;
        } else {
          const items = connected.map((d) => ({
            label: d.name ? `${d.name} (${d.id})` : d.id,
            deviceId: d.id,
          }));
          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: '选择设备',
            title: 'LogLens: 选择设备',
          });
          if (!picked) return;
          deviceId = picked.deviceId;
        }
        await provider.createOrShowPanel();
        await provider.start(deviceId);
      } catch (e) {
        const msg = (e as Error).message;
        vscode.window.showErrorMessage(`LogLens 启动失败: ${msg}`);
        if (msg.includes('ENOENT') || msg.includes('spawn')) {
          vscode.window.showInformationMessage('请确保已安装 adb 并已加入 PATH，或在设置中配置 LogLens 的 adbPath。');
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.refreshDevices', async () => {
      await provider.createOrShowPanel();
      await provider.refreshDevices();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.pause', () => {
      provider.setPaused(true);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.resume', () => {
      provider.setPaused(false);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.clear', async () => {
      await adb.clearLogcat().catch(() => {});
      provider.clearView();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.copySelected', () => {
      provider.requestCopySelected();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.exportToFile', async () => {
      await provider.exportToFile();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('androidLogcat.applyFilterPreset', async () => {
      await provider.requestApplyPreset();
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('androidLogcat')) {
        const cfg = vscode.workspace.getConfiguration('androidLogcat');
        adb.setAdbPath(cfg.get<string>('adbPath') ?? 'adb');
        provider.setMaxLines(cfg.get<number>('maxLogLines') ?? 100000);
      }
    })
  );
}

export function deactivate(): void {
  provider?.stop();
}
