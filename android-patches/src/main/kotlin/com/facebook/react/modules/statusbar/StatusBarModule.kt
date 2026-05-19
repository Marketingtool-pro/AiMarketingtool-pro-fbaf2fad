/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.modules.statusbar

import android.animation.ArgbEvaluator
import android.animation.ValueAnimator
import android.graphics.Color
import android.os.Build
import android.view.View
import android.view.WindowInsetsController
import android.view.WindowManager
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.common.logging.FLog
import com.facebook.fbreact.specs.NativeStatusBarManagerAndroidSpec
import com.facebook.react.bridge.GuardedRunnable
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.ReactConstants
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.view.isEdgeToEdgeFeatureFlagOn
import com.facebook.react.views.view.setStatusBarTranslucency
import com.facebook.react.views.view.setStatusBarVisibility

/** [NativeModule] that allows changing the appearance of the status bar. */
@ReactModule(name = NativeStatusBarManagerAndroidSpec.NAME)
internal class StatusBarModule(reactContext: ReactApplicationContext?) :
    NativeStatusBarManagerAndroidSpec(reactContext) {

  /**
   * Cache of the last color set via [setColor]. Used on API 35+ where
   * Window.getStatusBarColor() is deprecated and unavailable without suppression.
   */
  private var cachedStatusBarColor: Int? = null

  override fun getTypedExportedConstants(): Map<String, Any> {
    val currentActivity = reactApplicationContext.currentActivity
    val statusBarColor =
        if (Build.VERSION.SDK_INT >= 35) {
          cachedStatusBarColor?.let { String.format("#%06X", 0xFFFFFF and it) } ?: "black"
        } else {
          @Suppress("DEPRECATION")
          currentActivity?.window?.statusBarColor?.let { color ->
            String.format("#%06X", 0xFFFFFF and color)
          } ?: "black"
        }
    return mapOf(
        HEIGHT_KEY to PixelUtil.toDIPFromPixel(statusBarHeightPx(currentActivity).toFloat()),
        DEFAULT_BACKGROUND_COLOR_KEY to statusBarColor,
    )
  }

  /** Returns status bar height in pixels using the public Android resources API. */
  private fun statusBarHeightPx(context: android.content.Context?): Int {
    val res = context?.resources ?: android.content.res.Resources.getSystem()
    val id = res.getIdentifier("status_bar_height", "dimen", "android")
    return if (id > 0) res.getDimensionPixelSize(id) else 0
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
    cachedStatusBarColor = color
    UiThreadUtil.runOnUiThread(
        object : GuardedRunnable(reactApplicationContext) {
          override fun runGuarded() {
            val window = activity.window ?: return
            if (animated) {
              val curColor: Int =
                  if (Build.VERSION.SDK_INT >= 35) {
                    cachedStatusBarColor ?: Color.BLACK
                  } else {
                    @Suppress("DEPRECATION")
                    window.statusBarColor
                  }
              val colorAnimation = ValueAnimator.ofObject(ArgbEvaluator(), curColor, color)
              colorAnimation.addUpdateListener { animator ->
                applyStatusBarColor(activity.window, animator.animatedValue as Int)
              }
              colorAnimation.setDuration(300).startDelay = 0
              colorAnimation.start()
            } else {
              applyStatusBarColor(window, color)
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

  /**
   * Applies a status bar background color.
   * API < 35: uses Window.setStatusBarColor() (correct on these versions).
   * API >= 35: deprecated; Android 15 forces E2E so bar is transparent by policy.
   *            Only syncs icon appearance to match the requested color's luminance.
   */
  private fun applyStatusBarColor(window: android.view.Window?, color: Int) {
    window ?: return
    cachedStatusBarColor = color
    if (Build.VERSION.SDK_INT < 35) {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
      @Suppress("DEPRECATION")
      window.statusBarColor = color
    }
    WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars =
        isColorLight(color)
  }

  /** Returns true if the color has high enough luminance to warrant dark (visible) icons. */
  private fun isColorLight(color: Int): Boolean {
    val r = Color.red(color) / 255.0
    val g = Color.green(color) / 255.0
    val b = Color.blue(color) / 255.0
    val luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luminance > 0.179
  }

  companion object {
    private const val HEIGHT_KEY = "HEIGHT"
    private const val DEFAULT_BACKGROUND_COLOR_KEY = "DEFAULT_BACKGROUND_COLOR"
    const val NAME: String = NativeStatusBarManagerAndroidSpec.NAME
  }
}
