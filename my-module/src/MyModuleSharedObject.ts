import { SharedObject, useReleasingSharedObject } from 'expo-modules-core';

import MyModule from './MyModule';

export declare class MyModuleSharedObject extends SharedObject {
  count: number;
}

/**
 * Creates a new MyModuleSharedObject instance.
 * You are responsible for releasing it from memory by calling `release()` when done.
 */
export function createMyModuleSharedObject(): MyModuleSharedObject {
  return new MyModule.MyModuleSharedObject();
}

/**
 * A hook that creates a MyModuleSharedObject instance and automatically
 * releases it when the component unmounts.
 */
export function useMyModuleSharedObject(): MyModuleSharedObject {
  return useReleasingSharedObject(() => new MyModule.MyModuleSharedObject(), []);
}
