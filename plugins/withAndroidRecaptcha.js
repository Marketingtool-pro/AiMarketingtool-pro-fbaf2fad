const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * withAndroidRecaptcha.js
 *
 * Put the reCAPTCHA Enterprise SDK on the Android classpath so Firebase phone
 * auth has a device-verification path at all.
 *
 * Read off the Firebase console rather than assumed. Authentication ->
 * Settings -> reCAPTCHA, "Configured platform site keys":
 *
 *   platform   name              assessment count
 *   Android    marketingtool     0
 *   Web        marketingtool.pro 0
 *   iOS+       marketingTool     11
 *
 * Android has produced ZERO assessments. Not "few" -- none, ever. iOS has 11
 * against the same project and the same phone numbers, which is the platform
 * that works. That difference is the whole bug, and it is a packaging
 * difference, not a configuration one:
 *
 *   iOS      app.json expo-build-properties.ios.extraPods pulls in
 *            RecaptchaEnterprise ~> 18.0, so the Firebase iOS SDK finds it.
 *   Android  nothing pulls in com.google.android.recaptcha:recaptcha.
 *            @react-native-firebase/auth's android/build.gradle declares only
 *            com.google.firebase:firebase-auth, and `grep -ri recaptcha` over
 *            the generated android/ project matches nothing.
 *
 * Firebase Auth on Android loads reCAPTCHA Enterprise reflectively. Absent from
 * the classpath, it cannot run it, cannot mint an assessment, and the site key
 * configured in the console is unreachable -- which is exactly what an
 * assessment count of 0 looks like from the server side.
 *
 * Why that stops the SMS. Device verification on Android tries Play Integrity
 * first and falls back to reCAPTCHA. This project has that fallback missing, so
 * whenever Play Integrity does not produce a verdict the flow has nowhere left
 * to go and Firebase refuses to send, which surfaces as:
 *
 *   auth/missing-client-identifier
 *   -> "This device could not be verified for phone sign-in."
 *
 * The same console page has SMS fraud protection at "Block more (0.3)": an
 * unassessable request is not given the benefit of the doubt.
 *
 * The SDK-version prerequisite in that console note is already met -- the note
 * asks for Firebase Android SDK 23.1.0+ and @react-native-firebase/app 24.1.1
 * pins firebase-bom 34.14.0 -- so the artifact below is the only missing piece.
 *
 * This cannot regress iOS: it only adds an Android dependency.
 *
 * NOTE: a native dependency ships only in a new build. expo-updates is disabled
 * in this app (85a749bf2b, to kill the 551 AppLoader launch crash), so there is
 * no OTA path for it either way.
 */
// Pinned, not a range. Latest stable on Google's Maven at the time of writing,
// confirmed resolvable:
//   GET .../com/google/android/recaptcha/recaptcha/18.9.2/recaptcha-18.9.2.pom -> 200
const RECAPTCHA_DEPENDENCY = "com.google.android.recaptcha:recaptcha:18.9.2";

const MARKER = 'withAndroidRecaptcha';

module.exports = function withAndroidRecaptcha(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Idempotent: prebuild runs this repeatedly against an existing file.
    if (contents.includes(MARKER)) {
      return cfg;
    }

    const block = [
      '',
      `    // ${MARKER}: gives Firebase phone auth its reCAPTCHA fallback.`,
      '    // Without this artifact the Android reCAPTCHA site key can never be',
      '    // exercised (console assessment count sits at 0 while iOS reaches 11),',
      '    // and a device with no Play Integrity verdict has no way left to verify.',
      `    implementation "${RECAPTCHA_DEPENDENCY}"`,
    ].join('\n');

    // Anchor on the dependencies block opener that the Expo Android template
    // emits. Matching the first `dependencies {` at column 0 avoids the nested
    // ones inside buildscript/allprojects.
    const anchor = /^dependencies\s*\{/m;
    if (!anchor.test(contents)) {
      throw new Error(
        '[withAndroidRecaptcha] no top-level `dependencies {` block in app/build.gradle; ' +
          'the template changed and this plugin needs updating rather than silently skipping.'
      );
    }

    contents = contents.replace(anchor, (match) => `${match}${block}`);

    cfg.modResults.contents = contents;
    return cfg;
  });
};
