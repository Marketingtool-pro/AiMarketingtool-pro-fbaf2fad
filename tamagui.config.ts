import { createTamagui } from 'tamagui'
import { config as configV3 } from '@tamagui/config/v3'

export const config = createTamagui({
  ...configV3,
  themes: {
    ...configV3.themes,
    light: configV3.themes?.light || {
      background: '#fff',
      color: '#000',
    },
    dark: configV3.themes?.dark || {
      background: '#060b28',
      color: '#fff',
    },
  },
})

export type AppConfig = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
