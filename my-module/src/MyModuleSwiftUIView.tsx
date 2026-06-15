import { requireNativeView } from 'expo';
import { type CommonViewModifierProps } from '@expo/ui/swift-ui';
import { createViewModifierEventListener } from '@expo/ui/swift-ui/modifiers';
import * as React from 'react';

export interface MyModuleSwiftUIViewProps extends CommonViewModifierProps {
  title: string;
  children?: React.ReactNode;
}

const NativeMyModuleSwiftUIView = requireNativeView<MyModuleSwiftUIViewProps>(
  'MyModule',
  'MyModuleSwiftUIView'
);

export default function MyModuleSwiftUIView({
  modifiers,
  ...rest
}: MyModuleSwiftUIViewProps) {
  return (
    <NativeMyModuleSwiftUIView
      modifiers={modifiers}
      {...(modifiers ? createViewModifierEventListener(modifiers) : undefined)}
      {...rest}
    />
  );
}
