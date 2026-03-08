import { createTamagui } from 'tamagui'
import { config } from '@tamagui/config/v3'

const tamaguiConfig = createTamagui(config)

// To avoid Expo config "Unexpected token typeof" errors, 
// AppConfig and module declarations should be moved to a separate .d.ts file if needed.

export default tamaguiConfig
