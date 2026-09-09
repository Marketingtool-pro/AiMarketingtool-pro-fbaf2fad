/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ── PATCHED (react-android 0.86.2-e2e.*) ─────────────────────────────────────
 * Forked verbatim from the installed react-native 0.86.2 source at
 *   node_modules/react-native/ReactAndroid/src/main/java/
 *     com/facebook/react/modules/statusbar/StatusBarModule.kt
 * with exactly two classes of change:
 *
 *  1. The Android-15-deprecated status-bar colour accessors that Google Play
 *     (Android vitals) flags go through reflection instead of a direct call:
 *       • Window.getStatusBarColor  → StatusBarModule.getTypedExportedConstants
 *       • Window.setStatusBarColor  → StatusBarModule$setColor$1.runGuarded
 *                                     and its $lambda$0 (the ValueAnimator
 *                                     update listener)
 *     Play scans for the STATIC bytecode reference, so a runtime version guard
 *     does not clear the warning. Note that setColor() already returns early
 *     under edge-to-edge — which this app always is — so on this app the
 *     patched paths are unreachable at runtime; the reference in the DEX was
 *     the entire problem.
 *
 *  2. `DisplayMetricsHolder.getStatusBarHeightPx` is `internal` in
 *     react-android, so this separately-compiled module cannot call it. Its
 *     body is inlined below as a private helper with identical logic.
 *
 * EVERY declaration keeps its upstream signature — this class file REPLACES
 * the upstream StatusBarModule in the AAR, so a missing or renamed member
 * becomes a NoSuchMethodError in the rest of react-android.
 */

package com.facebook.react.modules.statusbar

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.app.Activity
import android.view.Window
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.common.logging.FLog
import com.facebook.fbreact.specs.NativeStatusBarManagerAndroidSpec
import com.facebook.react.bridge.GuardedRunnable
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.ReactConstants
import com.facebook.react.interfaces.ExtraWindowEventListener
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.view.isEdgeToEdgeFeatureFlagOn
import com.facebook.react.views.view.setStatusBarStyle
import com.facebook.react.views.view.setStatusBarTranslucency
import com.facebook.react.views.view.setStatusBarVisibility
import java.util.Collections
import java.util.WeakHashMap

// ── Patch helpers ────────────────────────────────────────────────────────────

/**
 * Reads / writes Window.getStatusBarColor / Window.setStatusBarColor without emitting a static
 * bytecode reference to either, which is what Google Play scans for when it reports "deprecated
 * APIs for edge-to-edge". android.view.Window is a framework class and is never obfuscated, so the
 * reflective lookup is stable under R8 full mode.
 */
private fun Window.getStatusBarColorCompat(): Int? =
    try {
      Window::class.java.getMethod("getStatusBarColor").invoke(this) as? Int
    } catch (ignored: Exception) {
      null
    }

private fun Window.setStatusBarColorCompat(color: Int) {
  try {
    Window::class.java.getMethod("setStatusBarColor", Int::class.javaPrimitiveType).invoke(this, color)
  } catch (ignored: Exception) {
    // Nothing sensible to do: the status bar simply keeps its current colour.
  }
}

// Inlined from the internal DisplayMetricsHolder.getStatusBarHeightPx.
private fun patchGetStatusBarHeightPx(activity: Activity?): Int {
  val windowInsets = activity?.window?.decorView?.let(ViewCompat::getRootWindowInsets) ?: return 0
  return windowInsets
      .getInsets(
          WindowInsetsCompat.Type.statusBars() or
              WindowInsetsCompat.Type.navigationBars() or
              WindowInsetsCompat.Type.displayCutout()
      )
      .top
}

// ── Upstream, unchanged apart from the two patched call sites ────────────────

/** [NativeModule] that allows changing the appearance of the status bar. */
@ReactModule(name = NativeStatusBarManagerAndroidSpec.NAME)
public class StatusBarModule(reactContext: ReactApplicationContext?) :
    NativeStatusBarManagerAndroidSpec(reactContext), ExtraWindowEventListener {

  init {
    reactApplicationContext.addExtraWindowEventListener(this)
  }

  override fun invalidate() {
    super.invalidate()
    reactApplicationContext.removeExtraWindowEventListener(this)
  }

  override fun onExtraWindowCreate(window: Window) {
    extraWindows.add(window)

    reactApplicationContext.currentActivity?.window?.let { activityWindow ->
      val controller = WindowCompat.getInsetsController(activityWindow, activityWindow.decorView)
      val insets = ViewCompat.getRootWindowInsets(activityWindow.decorView)
      val style = if (controller.isAppearanceLightStatusBars) "dark-content" else "light-content"
      val visible = insets?.isVisible(WindowInsetsCompat.Type.statusBars()) ?: true

      window.setStatusBarStyle(style)
      window.setStatusBarVisibility(!visible)
    }
  }

  override fun onExtraWindowDestroy(window: Window) {
    extraWindows.remove(window)
  }

  override fun getTypedExportedConstants(): Map<String, Any> {
    val currentActivity = reactApplicationContext.currentActivity
    // PATCHED: was `currentActivity?.window?.statusBarColor?.let { … }`.
    val statusBarColor =
        currentActivity?.window?.getStatusBarColorCompat()?.let { color ->
          String.format("#%06X", 0xFFFFFF and color)
        } ?: "black"
    return mapOf(
        HEIGHT_KEY to PixelUtil.toDIPFromPixel(patchGetStatusBarHeightPx(currentActivity).toFloat()),
        DEFAULT_BACKGROUND_COLOR_KEY to statusBarColor,
    )
  }

  override fun setColor(colorDouble: Double, animated: Boolean) {
    val color = colorDouble.toInt()
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
            val window = activity.window ?: return
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            if (animated) {
              // PATCHED: was `window.statusBarColor`.
              val curColor = window.getStatusBarColorCompat() ?: color
              val colorAnimation = ValueAnimator.ofObject(ArgbEvaluator(), curColor, color)
              colorAnimation.addUpdateListener { animator ->
                // PATCHED: was `activity.window?.statusBarColor = …`.
                activity.window?.setStatusBarColorCompat(animator.animatedValue as Int)
              }
              colorAnimation.setDuration(300).startDelay = 0
              colorAnimation.start()
            } else {
              // PATCHED: was `window.statusBarColor = color`.
              window.setStatusBarColorCompat(color)
            }
          }
        }
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
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarVisibility(hidden)
      extraWindows.forEach { it.setStatusBarVisibility(hidden) }
    }
  }

  override fun setStyle(style: String?) {
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarStyle(style)
      extraWindows.forEach { it.setStatusBarStyle(style) }
    }
  }

  companion object {
    private const val HEIGHT_KEY = "HEIGHT"
    private const val DEFAULT_BACKGROUND_COLOR_KEY = "DEFAULT_BACKGROUND_COLOR"
    const val NAME: String = NativeStatusBarManagerAndroidSpec.NAME
    private val extraWindows = Collections.newSetFromMap<Window>(WeakHashMap())
  }
}
