import MyModule, { MyModuleView, MyModuleSwiftUIView, MyModuleComposeView, myModuleSwiftUIModifier, myModuleComposeModifier, useMyModuleSharedObject } from 'my-module';
import { useEvent } from 'expo';
import { Host as SwiftUIHost, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { padding, cornerRadius, background } from '@expo/ui/swift-ui/modifiers';
import { VStack } from '@expo/ui/swift-ui';
import { Host as ComposeHost, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { paddingAll, background as composeBackground } from '@expo/ui/jetpack-compose/modifiers';
import { Column } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Button, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function App() {
  const onChangePayload = useEvent(MyModule, 'onChange');
  const sharedObject = useMyModuleSharedObject();
  const [sharedObjectCount, setSharedObjectCount] = useState(0);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Module API Example</Text>
        <Group name="Constants">
          <Text>{MyModule.PI}</Text>
        </Group>
        <Group name="Functions">
          <Text>{MyModule.hello()}</Text>
        </Group>
        <Group name="Async functions">
          <Button
            title="Set value"
            onPress={async () => {
              await MyModule.setValueAsync('Hello from JS!');
            }}
          />
        </Group>
        <Group name="Events">
          <Text>{onChangePayload?.value}</Text>
        </Group>
        <Group name="Views">
          <MyModuleView onTap={() => console.log('Tapped!')} style={styles.view} />
        </Group>
        <Group name="Shared Object">
          <Text>Count: {sharedObjectCount}</Text>
          <Button title="Read count" onPress={() => setSharedObjectCount(sharedObject.count)} />
          <Button
            title="Increment count"
            onPress={() => {
              sharedObject.count += 1;
            }}
          />
        </Group>
        {process.env.EXPO_OS === 'ios' && (
          <Group name="SwiftUI View">
            <SwiftUIHost style={styles.view}>
              <MyModuleSwiftUIView
                title="Hello from MyModule"
                modifiers={[padding({ all: 16 }), cornerRadius(12), background('#f0f0f0')]}>
                <SwiftUIText>Child content</SwiftUIText>
              </MyModuleSwiftUIView>
            </SwiftUIHost>
          </Group>
        )}
        {process.env.EXPO_OS === 'ios' && (
          <Group name="SwiftUI Modifier">
            <SwiftUIHost style={styles.view}>
              <VStack
                modifiers={[
                  padding({ all: 20 }),
                  myModuleSwiftUIModifier({ color: '#FF6B35', width: 3, cornerRadius: 8 }),
                ]}>
                <SwiftUIText>Custom modifier example</SwiftUIText>
              </VStack>
            </SwiftUIHost>
          </Group>
        )}
        {process.env.EXPO_OS === 'android' && (
          <Group name="Compose View">
            <ComposeHost style={styles.view}>
              <MyModuleComposeView
                title="Hello from MyModule"
                modifiers={[paddingAll(16), composeBackground('#f0f0f0')]}>
                <ComposeText>Child content</ComposeText>
              </MyModuleComposeView>
            </ComposeHost>
          </Group>
        )}
        {process.env.EXPO_OS === 'android' && (
          <Group name="Compose Modifier">
            <ComposeHost style={styles.view}>
              <Column
                modifiers={[
                  paddingAll(20),
                  myModuleComposeModifier({ color: 0xFFFF6B35, width: 3, cornerRadius: 8 }),
                ]}>
                <ComposeText>Custom modifier example</ComposeText>
              </Column>
            </ComposeHost>
          </Group>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = {
  header: { fontSize: 30, margin: 20 },
  groupHeader: { fontSize: 20, marginBottom: 20 },
  group: { margin: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20 },
  container: { flex: 1, backgroundColor: '#eee' },
  view: { flex: 1, height: 200 },
};
