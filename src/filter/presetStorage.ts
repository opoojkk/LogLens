import * as vscode from 'vscode';
import * as path from 'path';
import type { FilterPreset } from '../types';

const FILTERS_FILE = 'android-logcat-filters.json';

function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return undefined;
  return folders[0];
}

function getFiltersPath(): string | undefined {
  const folder = getWorkspaceFolder();
  if (!folder) return undefined;
  return path.join(folder.uri.fsPath, '.vscode', FILTERS_FILE);
}

export async function loadPresets(): Promise<FilterPreset[]> {
  const p = getFiltersPath();
  if (!p) return [];
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(p, 'utf-8');
    const json = JSON.parse(data);
    const list = Array.isArray(json.presets) ? json.presets : json;
    return list.map((item: unknown) => normalizePreset(item));
  } catch {
    return [];
  }
}

function normalizePreset(item: unknown): FilterPreset {
  const o = item as Record<string, unknown>;
  return {
    id: typeof o.id === 'string' ? o.id : `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: typeof o.name === 'string' ? o.name : 'Unnamed',
    enabled: o.enabled !== false,
    condition: (o.condition && typeof o.condition === 'object') ? (o.condition as FilterPreset['condition']) : {},
  };
}

export async function savePresets(presets: FilterPreset[]): Promise<void> {
  const folder = getWorkspaceFolder();
  if (!folder) return;
  const vscodeDir = path.join(folder.uri.fsPath, '.vscode');
  const p = path.join(vscodeDir, FILTERS_FILE);
  const fs = await import('fs/promises');
  await fs.mkdir(vscodeDir, { recursive: true });
  await fs.writeFile(p, JSON.stringify({ presets }, null, 2), 'utf-8');
}

export async function addOrUpdatePreset(preset: FilterPreset): Promise<void> {
  const presets = await loadPresets();
  const idx = presets.findIndex((p) => p.id === preset.id);
  if (idx >= 0) presets[idx] = preset;
  else presets.push(preset);
  await savePresets(presets);
}

export async function deletePreset(id: string): Promise<void> {
  const presets = (await loadPresets()).filter((p) => p.id !== id);
  await savePresets(presets);
}
