# Development Build Setup Guide

## ✅ What We've Done

1. **Configured Android SDK**

   - Set `ANDROID_HOME` in `~/.zshrc`
   - Created `android/local.properties` with SDK path
   - Installed required Android SDK components

2. **Fixed Bluetooth Printer Library**

   - Patched `react-native-bluetooth-escpos-printer` to work with modern Gradle
   - Removed deprecated jcenter repositories
   - Updated to secure HTTPS URLs
   - Created automatic patch script

3. **Configured Build Scripts**
   - Updated `package.json` with patch automation
   - Added `postinstall` script to apply patches after `npm install`

## 🚀 Building the App

### For Android

```bash
npm run android
```

This will:

1. Apply necessary patches to the Bluetooth library
2. Build the development APK
3. Install and launch on your connected Android device

### Prerequisites

- Android device connected via USB with USB debugging enabled
- Android SDK installed at `~/Library/Android/sdk`
- ANDROID_HOME environment variable set (already done)

## 📱 Running the App

Once the build completes:

1. The app will automatically install on your device
2. The Metro bundler will start
3. The app will launch showing the home screen

### Testing Bluetooth Printing

1. Pair your Bluetooth printer in Android Settings → Bluetooth
2. Open the app
3. Tap "Printer Settings"
4. Tap "Scan for Devices"
5. Select your printer from the list
6. Test with "Print Test Page"

## 🔧 Troubleshooting

### Build Fails with "SDK location not found"

Run:

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

### Bluetooth Library Issues After npm install

Run:

```bash
npm run patch-printer
```

### Permission Errors

Make sure your `app.json` includes:

```json
{
  "android": {
    "permissions": [
      "BLUETOOTH",
      "BLUETOOTH_ADMIN",
      "BLUETOOTH_CONNECT",
      "BLUETOOTH_SCAN",
      "ACCESS_FINE_LOCATION"
    ]
  }
}
```

### App Not Installing

Check device connection:

```bash
adb devices
```

Should show your device. If not:

- Enable USB debugging in Developer Options
- Accept USB debugging prompt on device

## 📦 Important Files

- `android/local.properties` - SDK location (gitignored)
- `scripts/patch-bluetooth-printer.sh` - Automatic patch for Bluetooth library
- `~/.zshrc` - Contains ANDROID_HOME environment variable

## 🔄 After Clean Install

If you run `npm install` or `npm ci`:

1. The `postinstall` script will automatically patch the library
2. Or run `npm run patch-printer` manually

## 📝 Notes

- **First build** takes 5-15 minutes (downloads dependencies)
- **Subsequent builds** are much faster (1-3 minutes)
- The Bluetooth printer library is automatically patched
- You need a **physical Android device** (Expo Go won't work)
- iOS build requires macOS with Xcode installed

## ⚡ Quick Commands

```bash
# Build and run on Android
npm run android

# Start development server only
npm start

# Apply printer library patch
npm run patch-printer

# Check connected devices
adb devices

# View Android logs
adb logcat | grep ReactNativeJS
```
