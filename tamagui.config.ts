import { createTamagui, createThemes } from 'tamagui'
import { config } from '@tamagui/config/v3'

// We want to ensure "dark" and "light" themes exist to avoid "Missing theme" crash
const themes = createThemes({
  light: {
    background: '#fff',
    color: '#000',
  },
  dark: {
    background: '#060b28',
    color: '#fff',
  }
})

const tamaguiConfig = createTamagui({
  ...config,
  themes: {
    ...config.themes,
    ...themes,
  }
})

export type AppConfig = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig
