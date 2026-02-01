import type { FilterPreset } from '../types';
export declare function loadPresets(): Promise<FilterPreset[]>;
export declare function savePresets(presets: FilterPreset[]): Promise<void>;
export declare function addOrUpdatePreset(preset: FilterPreset): Promise<void>;
export declare function deletePreset(id: string): Promise<void>;
//# sourceMappingURL=presetStorage.d.ts.map