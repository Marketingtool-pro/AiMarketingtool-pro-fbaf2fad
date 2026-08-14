# Mobile privacy disclosures — missing from marketingtool.pro/privacy-policy/

The published policy (Effective 1 Jan 2026, Last Updated 6 Mar 2026) describes the
**web** product: Google Ads data, Meta Ads data, Stripe payments, usage and device
info. The mobile app collects five further categories that the policy does not
mention. Google Play and Apple both require every collected category to be
disclosed, and Play separately requires that the Data Safety form match the policy.

Verified against `app.json` and `package.json` on Master.

| Category | What the app declares | Policy today |
|---|---|---|
| Advertising ID | `com.google.android.gms.permission.AD_ID`, `react-native-google-mobile-ads`, `expo-tracking-transparency`, `NSUserTrackingUsageDescription` | not mentioned |
| Phone number | Firebase phone OTP sign-in (`@react-native-firebase/auth`) | not mentioned |
| Camera & photos | `CAMERA`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `expo-image-picker` | not mentioned |
| Biometrics | `USE_BIOMETRIC`, `NSFaceIDUsageDescription`, `expo-local-authentication` | not mentioned |
| Push token | `expo-notifications`, `@react-native-firebase/messaging`, `UIBackgroundModes: remote-notification` | not mentioned |

Highest risk is the advertising ID. Play actively enforces that an app declaring
`AD_ID` must disclose advertising-ID collection; that check is automated.

---

## Draft sections to add

> ### Information we collect in our mobile apps
>
> In addition to the information described above, the MarketingTool mobile
> applications for Android and iOS collect the following.
>
> **Phone number.** If you choose to sign in with a phone number, we collect that
> number and send a one-time passcode to it by SMS. Delivery and verification are
> performed by Google Firebase Authentication. We use the number to authenticate
> you and to secure your account. We do not use it for marketing.
>
> **Advertising identifier.** The Android app collects your Google Advertising ID
> (AAID) and the iOS app may collect the Identifier for Advertisers (IDFA) in order
> to display advertising through Google AdMob. On iOS the IDFA is collected only if
> you grant permission through Apple's App Tracking Transparency prompt. You can
> reset or delete the advertising identifier at any time in your device settings,
> and on Android you can opt out of personalised advertising there as well.
>
> **Camera and photo library.** If you upload a profile photo or share generated
> content, the app accesses your camera or photo library. Access is requested at
> the moment you use the feature and can be revoked in device settings. Images are
> only uploaded to us if you choose to upload them; we do not access your photo
> library in the background.
>
> **Biometric authentication.** If you enable biometric sign-in, authentication is
> performed entirely on your device by the operating system (Face ID, Touch ID or
> Android biometrics). Your fingerprint or face data never leaves your device and
> is never transmitted to or stored by us. We store only a local flag recording
> that you enabled the feature.
>
> **Push notification token.** We collect a device push token issued by Firebase
> Cloud Messaging so that we can send you notifications. You can turn notifications
> off at any time in device settings, and the token is deleted when you sign out or
> uninstall the app.
>
> **Diagnostics.** The mobile apps use Firebase Crashlytics and Firebase Analytics
> to record crashes, errors and aggregate feature usage so that we can fix problems
> and improve the product.
>
> ### Third parties that process mobile data
>
> - **Google Firebase** (Authentication, Cloud Messaging, Crashlytics, Analytics,
>   App Check) — authentication, notifications, diagnostics
> - **Google AdMob** — advertising, using the advertising identifier
> - **Appwrite** — account and application data
> - **Apple App Store / Google Play** — subscription purchases and billing
>
> ### Your choices on mobile
>
> - Reset or delete your advertising identifier in device settings; on iOS, decline
>   or withdraw tracking permission at any time.
> - Revoke camera, photo and notification permissions in device settings.
> - Disable biometric sign-in in the app's settings.
> - Request deletion of your account and associated data at help@marketingtool.pro.

---

## Play Data Safety form — declare these

Sections must agree with the policy text above or the submission is rejected.

- Personal info → **Phone number** — collected, linked to identity, for account management
- Device or other IDs → **Device or other IDs** — collected, linked, for advertising
- Photos and videos → **Photos** — collected, if the upload feature is used
- App activity → **App interactions** — collected, for analytics
- App info and performance → **Crash logs**, **Diagnostics** — collected
- Financial info → **Purchase history** — collected, for subscriptions
- Note biometrics as processed on-device only, so not "collected"

## Apple App Privacy — declare these

- Data Used to Track You: **Identifiers (IDFA)** — this follows from shipping
  `NSUserTrackingUsageDescription`
- Data Linked to You: Contact Info (phone), Identifiers, Purchases, Usage Data,
  Diagnostics, User Content (photos)

## Also worth fixing

`app.json` ships Google's **test** AdMob application ID on iOS:

    "GADApplicationIdentifier": "ca-app-pub-3940256099942544~1458002511"
    react-native-google-mobile-ads.iosAppId — same test ID

Android uses a real publisher ID (`ca-app-pub-2789940907288323~8551339904`). Ads
are currently Android-only (`AdBanner` and `NativeAdCard` return null off
Android), so the test ID is inert today — but it must be replaced with the real
iOS app ID before ads are ever enabled on iOS.
