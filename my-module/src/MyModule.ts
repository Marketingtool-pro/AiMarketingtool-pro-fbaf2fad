import { NativeModule, requireNativeModule } from 'expo';

import { MyModuleEvents } from './MyModule.types';
import type { MyModuleSharedObject } from './MyModuleSharedObject';

declare class MyModule extends NativeModule<MyModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
  MyModuleSharedObject: typeof MyModuleSharedObject;
}

export default requireNativeModule<MyModule>('MyModule');
