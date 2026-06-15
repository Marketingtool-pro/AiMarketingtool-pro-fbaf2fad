import { createModifier, type ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';

export const myModuleComposeModifier = (params: {
  color?: number;
  width?: number;
  cornerRadius?: number;
}): ModifierConfig => createModifier('myModuleComposeModifier', params);
