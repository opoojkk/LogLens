# LogLens

在 VS Code 中实时查看与筛选 Android Logcat 日志，接近 Android Studio 体验，支持筛选预设、包名绑定、多设备。

## 功能概览（按 PRD）

- **日志获取**：`adb logcat -v threadtime`，单设备 / 多设备选择
- **日志展示**：Webview + 虚拟滚动，支持 10 万行+，Level 高亮（E 红 / W 黄 / D·I 蓝灰）
- **筛选**：Level 多选、Tag 包含/排除、包名（自动映射 PID）、文本包含、正则
- **Filter Preset**：保存/应用/删除预设，存储于 `.vscode/android-logcat-filters.json`，可提交 Git 团队共享
- **设备与进程**：设备列表与热插拔、包名绑定、App 重启自动刷新 PID
- **辅助**：Pause/Resume、Clear、复制选中/单条、导出文件、搜索高亮
- **稳定性**：adb 断连 2 秒后自动重试

## 使用方式

1. **启动**：`Ctrl+Shift+P`（或 `Cmd+Shift+P`）→ 输入 **LogLens: Start** → 选择设备
2. **包名**：在工具栏输入包名，仅显示该 App 日志，进程重启后自动更新 PID
3. **筛选**：勾选 Level、填写 Tag 包含/排除、文本、正则；点击日志行中的 **Tag** 可快速按该 Tag 筛选，点击 **PID** 可复制
4. **预设**：设置好筛选后点「保存预设」；「预设」下拉选择后应用；「删除预设」删除当前选中预设
5. **复制/导出**：多选行（Ctrl/Cmd+点击）后点「Copy」或命令 **LogLens: Copy Selected**；**LogLens: Export to File** 导出当前筛选结果

## 配置

- `androidLogcat.adbPath`：adb 可执行路径，默认 `adb`（系统 PATH）
- `androidLogcat.maxLogLines`：最大缓存行数，默认 100000，超出丢弃旧日志

## 开发与调试

```bash
npm install
npm run compile
```

在 VS Code 中按 **F5** 启动「扩展开发主机」，在新窗口中执行 **LogLens: Start** 即可调试。

## 非目标（PRD）

- 不替代 Android Studio
- 不实现断点/Profiler 等完整调试
- 不支持非 adb 来源日志

## 许可证

MIT
