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
exports.loadPresets = loadPresets;
exports.savePresets = savePresets;
exports.addOrUpdatePreset = addOrUpdatePreset;
exports.deletePreset = deletePreset;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const FILTERS_FILE = 'android-logcat-filters.json';
function getWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length)
        return undefined;
    return folders[0];
}
function getFiltersPath() {
    const folder = getWorkspaceFolder();
    if (!folder)
        return undefined;
    return path.join(folder.uri.fsPath, '.vscode', FILTERS_FILE);
}
async function loadPresets() {
    const p = getFiltersPath();
    if (!p)
        return [];
    try {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const data = await fs.readFile(p, 'utf-8');
        const json = JSON.parse(data);
        const list = Array.isArray(json.presets) ? json.presets : json;
        return list.map((item) => normalizePreset(item));
    }
    catch {
        return [];
    }
}
function normalizePreset(item) {
    const o = item;
    return {
        id: typeof o.id === 'string' ? o.id : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: typeof o.name === 'string' ? o.name : 'Unnamed',
        enabled: o.enabled !== false,
        condition: (o.condition && typeof o.condition === 'object') ? o.condition : {},
    };
}
async function savePresets(presets) {
    const folder = getWorkspaceFolder();
    if (!folder)
        return;
    const vscodeDir = path.join(folder.uri.fsPath, '.vscode');
    const p = path.join(vscodeDir, FILTERS_FILE);
    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    await fs.mkdir(vscodeDir, { recursive: true });
    await fs.writeFile(p, JSON.stringify({ presets }, null, 2), 'utf-8');
}
async function addOrUpdatePreset(preset) {
    const presets = await loadPresets();
    const idx = presets.findIndex((p) => p.id === preset.id);
    if (idx >= 0)
        presets[idx] = preset;
    else
        presets.push(preset);
    await savePresets(presets);
}
async function deletePreset(id) {
    const presets = (await loadPresets()).filter((p) => p.id !== id);
    await savePresets(presets);
}
//# sourceMappingURL=presetStorage.js.map