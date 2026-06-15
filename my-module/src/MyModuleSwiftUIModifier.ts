import { createModifier, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

export const myModuleSwiftUIModifier = (params: {
  color?: string;
  width?: number;
  cornerRadius?: number;
}): ModifierConfig => createModifier('myModuleSwiftUIModifier', params);
