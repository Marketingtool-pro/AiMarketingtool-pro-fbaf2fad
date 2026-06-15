import SwiftUI
import ExpoModulesCore
import ExpoUI

final class MyModuleSwiftUIViewProps: UIBaseViewProps {
  @Field var title: String = ""
}

struct MyModuleSwiftUIView: ExpoSwiftUI.View {
  @ObservedObject public var props: MyModuleSwiftUIViewProps

  var body: some View {
    VStack {
      Text(props.title)
        .font(.headline)
      Children()
    }
  }
}
