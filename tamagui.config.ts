import { createTamagui } from 'tamagui'
import { config } from '@tamagui/config/v3'

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    light: config.themes?.light || {
      background: '#fff',
      color: '#000',
    },
    dark: config.themes?.dark || {
      background: '#060b28',
      color: '#fff',
    },
  },
})

export type AppConfig = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig
