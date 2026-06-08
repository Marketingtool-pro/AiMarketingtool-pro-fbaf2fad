/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * ── PATCHED (react-android 0.85.3-e2e.1) ──────────────────────────────────────
 * Removes EVERY reference to the Android-15-deprecated edge-to-edge APIs that
 * Google Play (Android vitals) flags — not just runtime-guards them, because Play
 * scans for the static bytecode references:
 *   • Window.setStatusBarColor      (statusBarColor = …)        → removed
 *   • Window.setNavigationBarColor  (navigationBarColor = …)    → removed
 *   • LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES                 → ALWAYS
 *   • LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT                     → ALWAYS
 * Edge-to-edge transparency is handled by WindowCompat.setDecorFitsSystemWindows
 * + WindowInsetsControllerCompat, so the colour setters are unnecessary anyway.
 * Public/internal API signatures are IDENTICAL to upstream 0.85.3 so the rest of
 * react-android and the JS bridge link unchanged.
 */

package com.facebook.react.views.view

import android.graphics.Color
import android.os.Build
import android.view.Window
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.views.common.UiModeUtils

internal val LightNavigationBarColor = Color.argb(0xe6, 0xFF, 0xFF, 0xFF)
internal val DarkNavigationBarColor = Color.argb(0x80, 0x1b, 0x1b, 0x1b)

public var isEdgeToEdgeFeatureFlagOn: Boolean = false
  private set

public fun setEdgeToEdgeFeatureFlagOn() {
  isEdgeToEdgeFeatureFlagOn = true
}

@Suppress("DEPRECATION")
internal fun Window.setStatusBarTranslucency(isTranslucent: Boolean) {
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

internal fun Window.setStatusBarVisibility(isHidden: Boolean) {
  if (isHidden) {
    this.statusBarHide()
  } else {
    this.statusBarShow()
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
      // Patched: SHORT_EDGES (deprecated/flagged) -> ALWAYS
      attributes.layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
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
      // Patched: DEFAULT (deprecated/flagged) -> ALWAYS
      attributes.layoutInDisplayCutoutMode =
          WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
      setDecorFitsSystemWindows(true)
    }
    addFlags(WindowManager.LayoutParams.FLAG_FORCE_NOT_FULLSCREEN)
    clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
  }
}

internal fun Window.enableEdgeToEdge() {
  WindowCompat.setDecorFitsSystemWindows(this, false)

  val isDarkMode = UiModeUtils.isDarkMode(context)

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    isStatusBarContrastEnforced = false
    isNavigationBarContrastEnforced = true
  }

  // Patched: the deprecated `statusBarColor` / `navigationBarColor` setters are
  // REMOVED entirely (Google Play flags the static references on Android 15).
  // Under edge-to-edge the system bars are transparent via setDecorFitsSystemWindows
  // above + the insets controller below, so the colour setters are not needed.
  // LightNavigationBarColor / DarkNavigationBarColor are retained as module-internal
  // constants for API compatibility with the rest of react-android.

  WindowInsetsControllerCompat(this, decorView).run {
    isAppearanceLightNavigationBars = !isDarkMode
  }

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    // Patched: SHORT_EDGES (deprecated/flagged) -> ALWAYS on all supported levels.
    attributes.layoutInDisplayCutoutMode =
        WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
  }
}

internal fun Window.disableEdgeToEdge() {
  WindowCompat.setDecorFitsSystemWindows(this, true)
}
