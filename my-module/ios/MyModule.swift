import ExpoModulesCore
import ExpoUI

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Events("onChange")

    Constant("PI") {
      Double.pi
    }

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    View(MyModuleView.self) {
      Events("onTap")
    }

    Class(MyModuleSharedObject.self) {
      Constructor { () -> MyModuleSharedObject in
        return MyModuleSharedObject()
      }

      Property("count") { (ref: MyModuleSharedObject) -> Int in
        return ref.count
      }
      .set { (ref: MyModuleSharedObject, count: Int) in
        ref.count = count
      }
    }

    ExpoUIView(MyModuleSwiftUIView.self)

    OnCreate {
      ViewModifierRegistry.register("myModuleSwiftUIModifier") { params, appContext, _ in
        return try MyModuleSwiftUIModifier(from: params, appContext: appContext)
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("myModuleSwiftUIModifier")
    }
  }
}
