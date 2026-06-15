package expo.modules.mymodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.ui.ExpoUIView
import expo.modules.kotlin.records.recordFromMap
import expo.modules.ui.ModifierRegistry

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    Events("onChange")

    Constant("PI") {
      Math.PI
    }

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }

    View(MyModuleView::class) {
      // Defines an event that the view can send to JavaScript.
      Events("onTap")
    }

    Class(MyModuleSharedObject::class) {
      Constructor {
        val instance = MyModuleSharedObject(appContext)
        return@Constructor instance
      }

      Property("count")
        .get { ref: MyModuleSharedObject ->
          ref.count
        }
        .set { ref: MyModuleSharedObject, count: Int ->
          ref.count = count
        }
    }

    ExpoUIView<MyModuleComposeViewProps>("MyModuleComposeView") {
      Content { props ->
        MyModuleComposeViewContent(props)
      }
    }

    OnCreate {
      ModifierRegistry.register("myModuleComposeModifier") { params, _, _, _ ->
        recordFromMap<MyModuleComposeModifierParams>(params).toModifier()
      }
    }
  }
}
