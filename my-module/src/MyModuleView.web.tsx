import * as React from 'react';

import { MyModuleViewProps } from './MyModule.types';

export default function MyModuleView(props: MyModuleViewProps) {
  return (
    <div
      style={{
        backgroundColor: '#aabbcc',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={() => props.onTap({ nativeEvent: {} })}>
      <span>MyModule - native view</span>
      <span>Tap the view to emit a view event</span>
    </div>
  );
}
