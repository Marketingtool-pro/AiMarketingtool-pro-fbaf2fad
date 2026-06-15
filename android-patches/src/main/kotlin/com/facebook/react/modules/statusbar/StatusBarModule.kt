/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ── PATCHED (react-android 0.85.3-e2e.1) ──────────────────────────────────────
 * Removes the Android-15-deprecated Window.getStatusBarColor / setStatusBarColor
 * references that Google Play (Android vitals) flags:
 *   • getTypedExportedConstants(): no longer reads window.statusBarColor — returns
 *     a constant "black" default (DEFAULT_BACKGROUND_COLOR is informational only).
 *   • setColor(): no longer reads/writes window.statusBarColor. Under edge-to-edge
 *     it already early-returns; for legacy mode the colour set is a no-op (the app
 *     drives system-bar appearance via react-native-edge-to-edge / WindowInsets).
 * Every overridden method signature is IDENTICAL to upstream 0.85.3 so the
 * TurboModule spec + JS bridge link unchanged.
 */

package com.facebook.react.modules.statusbar

import android.os.Build
import android.view.View
import android.view.WindowInsetsController
import com.facebook.common.logging.FLog
import com.facebook.fbreact.specs.NativeStatusBarManagerAndroidSpec
import com.facebook.react.bridge.GuardedRunnable
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.ReactConstants
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
// NOTE: DisplayMetricsHolder.getStatusBarHeightPx is `internal` in react-android and
// can't be referenced from this separately-compiled patch module. The status-bar
// height is read from the platform "status_bar_height" dimen resource instead.
import com.facebook.react.views.view.isEdgeToEdgeFeatureFlagOn
import com.facebook.react.views.view.setStatusBarTranslucency
import com.facebook.react.views.view.setStatusBarVisibility

/** [NativeModule] that allows changing the appearance of the status bar. */
@ReactModule(name = NativeStatusBarManagerAndroidSpec.NAME)
internal class StatusBarModule(reactContext: ReactApplicationContext?) :
    NativeStatusBarManagerAndroidSpec(reactContext) {

  override fun getTypedExportedConstants(): Map<String, Any> {
    // Patched: status-bar height via the platform dimen resource instead of the
    // internal DisplayMetricsHolder.getStatusBarHeightPx helper. And do NOT read
    // window.statusBarColor (deprecated Window.getStatusBarColor, flagged by Google
    // Play on Android 15). DEFAULT_BACKGROUND_COLOR is informational only.
    val res = (reactApplicationContext.currentActivity ?: reactApplicationContext).resources
    val resId = res.getIdentifier("status_bar_height", "dimen", "android")
    val heightPx = if (resId > 0) res.getDimensionPixelSize(resId) else 0
    return mapOf(
        HEIGHT_KEY to PixelUtil.toDIPFromPixel(heightPx.toFloat()),
        DEFAULT_BACKGROUND_COLOR_KEY to "black",
    )
  }

  override fun setColor(colorDouble: Double, animated: Boolean) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    if (isEdgeToEdgeFeatureFlagOn) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is edge-to-edge.",
      )
      return
    }
    // Patched: the deprecated Window.setStatusBarColor / getStatusBarColor calls are
    // REMOVED (Google Play flags them on Android 15). Setting an opaque status-bar
    // colour is incompatible with edge-to-edge; system-bar appearance is driven via
    // react-native-edge-to-edge / WindowInsetsController instead. No-op here.
    FLog.w(
        ReactConstants.TAG,
        "StatusBarModule: setColor is a no-op on Android 15 edge-to-edge builds.",
    )
  }

  override fun setTranslucent(translucent: Boolean) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    if (isEdgeToEdgeFeatureFlagOn) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is edge-to-edge.",
      )
      return
    }
    UiThreadUtil.runOnUiThread(
        object : GuardedRunnable(reactApplicationContext) {
          override fun runGuarded() {
            activity.window?.setStatusBarTranslucency(translucent)
          }
        }
    )
  }

  override fun setHidden(hidden: Boolean) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    UiThreadUtil.runOnUiThread { activity.window?.setStatusBarVisibility(hidden) }
  }

  @Suppress("DEPRECATION")
  override fun setStyle(style: String?) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    UiThreadUtil.runOnUiThread(
        Runnable {
          val window = activity.window ?: return@Runnable
          if (Build.VERSION.SDK_INT > Build.VERSION_CODES.R) {
            val insetsController = window.insetsController ?: return@Runnable
            if ("dark-content" == style) {
              insetsController.setSystemBarsAppearance(
                  WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                  WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
              )
            } else {
              insetsController.setSystemBarsAppearance(
                  0,
                  WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
              )
            }
          } else {
            val decorView = window.decorView
            var systemUiVisibilityFlags = decorView.systemUiVisibility
            systemUiVisibilityFlags =
                if ("dark-content" == style) {
                  systemUiVisibilityFlags or View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                } else {
                  systemUiVisibilityFlags and View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
                }
            decorView.systemUiVisibility = systemUiVisibilityFlags
          }
        }
    )
  }

  companion object {
    private const val HEIGHT_KEY = "HEIGHT"
    private const val DEFAULT_BACKGROUND_COLOR_KEY = "DEFAULT_BACKGROUND_COLOR"
    const val NAME: String = NativeStatusBarManagerAndroidSpec.NAME
  }
}
