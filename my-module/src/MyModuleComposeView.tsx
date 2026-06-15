import { requireNativeView } from 'expo';
import { type PrimitiveBaseProps } from '@expo/ui/jetpack-compose';
import { createViewModifierEventListener } from '@expo/ui/jetpack-compose/modifiers';
import * as React from 'react';

export interface MyModuleComposeViewProps extends PrimitiveBaseProps {
  title: string;
  children?: React.ReactNode;
}

const NativeMyModuleComposeView = requireNativeView<MyModuleComposeViewProps>(
  'MyModule',
  'MyModuleComposeView'
);

export default function MyModuleComposeView({
  modifiers,
  ...rest
}: MyModuleComposeViewProps) {
  return (
    <NativeMyModuleComposeView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
    />
  );
}
