/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.view

import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
import android.view.Window
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

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
  if (isHidden) this.statusBarHide() else this.statusBarShow()
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
  val isDarkMode = (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
      Configuration.UI_MODE_NIGHT_YES

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    isStatusBarContrastEnforced = false
    isNavigationBarContrastEnforced = true
  }

  if (Build.VERSION.SDK_INT < 35) {
    @Suppress("DEPRECATION")
    statusBarColor = Color.TRANSPARENT
    @Suppress("DEPRECATION")
    navigationBarColor =
        when {
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> Color.TRANSPARENT
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isDarkMode -> LightNavigationBarColor
          else -> DarkNavigationBarColor
        }
  }

  WindowInsetsControllerCompat(this, decorView).run {
    isAppearanceLightStatusBars = !isDarkMode
    isAppearanceLightNavigationBars = !isDarkMode
  }

  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    attributes.layoutInDisplayCutoutMode =
        when {
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ->
              WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
          else ->
              WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
  }
}

internal fun Window.disableEdgeToEdge() {
  WindowCompat.setDecorFitsSystemWindows(this, true)
}
