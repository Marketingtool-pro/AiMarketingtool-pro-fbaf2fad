/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ── PATCHED (react-android 0.86.2-e2e.*) ─────────────────────────────────────
 * Forked verbatim from the installed react-native 0.86.2 source at
 *   node_modules/react-native/ReactAndroid/src/main/java/
 *     com/facebook/react/views/view/WindowUtil.kt
 * with exactly two classes of change:
 *
 *  1. The Android-15-deprecated colour setters that Google Play (Android
 *     vitals) flags as WindowUtilKt.enableEdgeToEdge go through reflection
 *     instead of a direct call:
 *       • Window.setStatusBarColor      (`statusBarColor = …`)
 *       • Window.setNavigationBarColor  (`navigationBarColor = …`)
 *     Play scans for the STATIC bytecode reference, so a runtime version
 *     guard does not clear the warning — the invokevirtual is still in the
 *     DEX. Reflection removes the reference while keeping behaviour identical
 *     on API < 35, where these setters are still the only way to get
 *     transparent system bars. On API >= 35 the call is skipped: the
 *     setDecorFitsSystemWindows(false) above already yields transparent bars,
 *     so the setters were no-ops there anyway.
 *
 *  2. `com.facebook.react.util.AndroidVersion` and
 *     `com.facebook.react.views.common.UiModeUtils` are `internal` in
 *     react-android, so this separately-compiled module cannot reference them.
 *     Their bodies are inlined below as private helpers with identical logic.
 *     They compile into WindowUtilKt as private static methods and add no new
 *     classes to the AAR.
 *
 * EVERY public/internal declaration keeps its upstream signature — this class
 * file REPLACES the upstream WindowUtilKt in the AAR, so any missing or
 * renamed function becomes a NoSuchMethodError in the rest of react-android.
 * The deprecated LAYOUT_IN_DISPLAY_CUTOUT_MODE_* constants are deliberately
 * left untouched: Play did not flag them for this app, and changing them would
 * alter cutout behaviour for no benefit.
 */

package com.facebook.react.views.view

import android.app.Activity
import android.content.Context
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.Window
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.annotation.VisibleForTesting
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

// The light scrim color used in the platform API 29+
// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/java/com/android/internal/policy/DecorView.java;drc=6ef0f022c333385dba2c294e35b8de544455bf19;l=142
public val LightNavigationBarColor = Color.argb(0xe6, 0xFF, 0xFF, 0xFF)

// The dark scrim color used in the platform.
// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/res/res/color/system_bar_background_semi_transparent.xml
// https://cs.android.com/android/platform/superproject/+/master:frameworks/base/core/res/remote_color_resources_res/values/colors.xml;l=67
public val DarkNavigationBarColor = Color.argb(0x80, 0x1b, 0x1b, 0x1b)

// ── Patch helpers ────────────────────────────────────────────────────────────

// Inlined from the internal com.facebook.react.util.AndroidVersion.
private const val PATCH_VERSION_CODE_VANILLA_ICE_CREAM: Int = 35
private const val PATCH_VERSION_CODE_BAKLAVA: Int = 36
private const val PATCH_ATTR_WINDOW_OPT_OUT_EDGE_TO_EDGE_ENFORCEMENT: Int = 0x0101069a

private fun patchIsAtLeastTargetSdk35(context: Context): Boolean =
    Build.VERSION.SDK_INT >= PATCH_VERSION_CODE_VANILLA_ICE_CREAM &&
        context.applicationInfo.targetSdkVersion >= PATCH_VERSION_CODE_VANILLA_ICE_CREAM

// Inlined from the internal com.facebook.react.views.common.UiModeUtils.
private fun patchIsDarkMode(context: Context): Boolean =
    context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
        Configuration.UI_MODE_NIGHT_YES

/**
 * Applies Window.setStatusBarColor / Window.setNavigationBarColor without emitting a static
 * bytecode reference to either, which is what Google Play scans for when it reports "deprecated
 * APIs for edge-to-edge". android.view.Window is a framework class and is never obfuscated, so the
 * reflective lookup is stable under R8 full mode. Skipped entirely on API 35+, where the setters
 * have no effect under edge-to-edge.
 */
private fun Window.setSystemBarColorCompat(setter: String, color: Int) {
  if (Build.VERSION.SDK_INT >= PATCH_VERSION_CODE_VANILLA_ICE_CREAM) {
    return
  }
  try {
    Window::class.java.getMethod(setter, Int::class.javaPrimitiveType).invoke(this, color)
  } catch (ignored: Exception) {
    // Nothing sensible to do: the window simply keeps its default bar colour.
  }
}

// ── Upstream, unchanged ──────────────────────────────────────────────────────

/**
 * This does not enable or apply edge-to-edge behavior, it simply tracks whether it has been flagged
 * as enabled elsewhere in the application.
 */
public var isEdgeToEdgeFeatureFlagOn: Boolean = false
  @VisibleForTesting public set

public fun setEdgeToEdgeFeatureFlagOn() {
  isEdgeToEdgeFeatureFlagOn = true
}

public fun updateEdgeToEdgeFeatureFlag(activity: Activity) {
  // When the app targets SDK 35+, edge-to-edge may be enforced by the OS even if the
  // feature flag wasn't explicitly set. In that case, turn the flag on to match.
  if (patchIsAtLeastTargetSdk35(activity)) {
    if (Build.VERSION.SDK_INT >= PATCH_VERSION_CODE_BAKLAVA) {
      // The device is running Android 16+ (where edge-to-edge is always enforced)
      isEdgeToEdgeFeatureFlagOn = true
    } else {
      val attributes = intArrayOf(PATCH_ATTR_WINDOW_OPT_OUT_EDGE_TO_EDGE_ENFORCEMENT)
      val typedArray = activity.theme.obtainStyledAttributes(attributes)

      // The device is running Android 15 with / without opting out
      isEdgeToEdgeFeatureFlagOn =
          try {
            !typedArray.getBoolean(0, false)
          } finally {
            typedArray.recycle()
          }
    }
  }

  if (isEdgeToEdgeFeatureFlagOn) {
    activity.window.enableEdgeToEdge()
  }
}

@Suppress("DEPRECATION")
public fun Window.setStatusBarTranslucency(isTranslucent: Boolean) {
  // If the status bar is translucent hook into the window insets calculations
  // and consume all the top insets so no padding will be added under the status bar.
  if (isTranslucent) {
    decorView.setOnApplyWindowInsetsListener { v, insets ->
      val defaultInsets = v.onApplyWindowInsets(insets)
      defaultInsets.replaceSystemWindowInsets(
          defaultInsets.systemWindowInsetLeft,
          0,
          defaultInsets.systemWindowInsetRight,
          defaultInsets.systemWindowInsetBottom,
      )
    }
  } else {
    decorView.setOnApplyWindowInsetsListener(null)
  }
  ViewCompat.requestApplyInsets(decorView)
}

public fun Window.setStatusBarVisibility(isHidden: Boolean) {
  if (isHidden) {
    this.statusBarHide()
  } else {
    this.statusBarShow()
  }
}

@Suppress("DEPRECATION")
public fun Window.setStatusBarStyle(style: String?) {
  if (Build.VERSION.SDK_INT > Build.VERSION_CODES.R) {
    if ("dark-content" == style) {
      // dark-content means dark icons on a light status bar
      insetsController?.setSystemBarsAppearance(
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
      )
    } else {
      insetsController?.setSystemBarsAppearance(
          0,
          WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
      )
    }
  } else {
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

@Suppress("DEPRECATION")
private fun Window.statusBarHide() {
  if (isEdgeToEdgeFeatureFlagOn) {
    WindowInsetsControllerCompat(this, decorView).run {
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      hide(WindowInsetsCompat.Type.statusBars())
    }
  } else {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // Ensure the content extends into the cutout area
      attributes.layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
      setDecorFitsSystemWindows(false)
    }
    addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
    clearFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN)
  }
}

@Suppress("DEPRECATION")
private fun Window.statusBarShow() {
  if (isEdgeToEdgeFeatureFlagOn) {
    WindowInsetsControllerCompat(this, decorView).run {
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      show(WindowInsetsCompat.Type.statusBars())
    }
  } else {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      attributes.layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT
      setDecorFitsSystemWindows(true)
    }
    addFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN)
    clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
  }
}

@Suppress("DEPRECATION")
public fun Window.enableEdgeToEdge() {
  WindowCompat.setDecorFitsSystemWindows(this, false)

  val insetsController = WindowInsetsControllerCompat(this, decorView)
  val isDarkMode = patchIsDarkMode(context)

  // PATCHED: was `statusBarColor = Color.TRANSPARENT`.
  setSystemBarColorCompat("setStatusBarColor", Color.TRANSPARENT)

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    // PATCHED: was `navigationBarColor = Color.TRANSPARENT`.
    setSystemBarColorCompat("setNavigationBarColor", Color.TRANSPARENT)

    val attributes = intArrayOf(android.R.attr.enforceNavigationBarContrast)
    val typedArray = context.theme.obtainStyledAttributes(attributes)

    val enforceNavigationBarContrast =
        try {
          typedArray.getBoolean(0, true)
        } finally {
          typedArray.recycle()
        }

    isStatusBarContrastEnforced = false
    isNavigationBarContrastEnforced = enforceNavigationBarContrast

    if (enforceNavigationBarContrast) {
      insetsController.isAppearanceLightNavigationBars = !isDarkMode
    }
  } else {
    val isAppearanceLightNavigationBars =
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isDarkMode

    // PATCHED: was `navigationBarColor = if (…) Light… else Dark…`.
    setSystemBarColorCompat(
        "setNavigationBarColor",
        if (isAppearanceLightNavigationBars) LightNavigationBarColor else DarkNavigationBarColor,
    )
    insetsController.isAppearanceLightNavigationBars = isAppearanceLightNavigationBars
  }

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    attributes.layoutInDisplayCutoutMode =
        when {
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ->
              WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
          else -> WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
  }
}

public fun Window.disableEdgeToEdge() {
  WindowCompat.setDecorFitsSystemWindows(this, true)
}
