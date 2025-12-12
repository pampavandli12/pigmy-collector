# Pigmy Collector

A mobile application for managing daily collections and deposits with Bluetooth receipt printing functionality. Built with Expo, React Native, and React Native Paper.

## Features

- 📱 **Agent Dashboard** - View daily collections, due payments, and completed transactions
- 👥 **Customer Management** - Browse and search customer list with detailed profiles
- 💰 **Deposit Management** - Record new deposits with amount, date, and receipt upload
- 🖨️ **Bluetooth Printing** - Connect to Bluetooth thermal printers for receipt printing
- 🔐 **Agent Login** - Secure authentication with username/password or OTP
- 🌐 **Multi-language Support** - English and Kannada language options
- 📊 **Transaction History** - View recent transactions with status tracking
- 🆘 **Support** - Access help resources via call, email, or ticket submission

## Tech Stack

- **Framework**: Expo SDK 54.0.29
- **React Native**: 0.81.5
- **React**: 19.1.0
- **UI Library**: React Native Paper (Material Design 3)
- **Navigation**: Expo Router 6.0.19
- **Fonts**: Google Roboto (Regular, Medium, Bold)
- **Bluetooth**: react-native-bluetooth-escpos-printer
- **Icons**: Material Design Icons (via react-native-vector-icons)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or later)
- **npm** or **yarn**
- **Java Development Kit (JDK)** - Version 17
- **Android Studio** (for Android development)
  - Android SDK (API 34/36, minSdk 24)
  - Android Emulator or physical device with USB debugging enabled

### Environment Setup

Set up Android environment variables (add to `~/.zshrc` or `~/.bashrc`):

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd pigmy-collector
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

## Running the App

**⚠️ Important**: This app uses native Bluetooth modules and **cannot run on Expo Go**. You must build a development version.

### First Time Setup

Build the development version for Android:

```bash
npx expo run:android
```

This will:

- Generate native Android code in the `/android` folder
- Install all dependencies
- Build and install the APK on your connected device/emulator
- Start the Metro bundler

### Subsequent Runs

After the initial build, you can start the development server:

```bash
npm start
```

Then press `a` to open on Android device/emulator.

**Or run directly:**

```bash
npx expo run:android
```

## Project Structure

```
pigmy-collector/
├── app/
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── dashboard.tsx    # Agent dashboard with stats
│   │   ├── users.tsx        # Customer list
│   │   ├── deposits.tsx     # New deposit form
│   │   └── support.tsx      # Help & support
│   ├── _layout.tsx          # Root layout with providers
│   ├── index.tsx            # Sign-in/login screen
│   └── userDetail.tsx       # Customer detail page
├── components/
│   └── PrinterManager.tsx   # Bluetooth printer UI
├── contexts/
│   └── PrinterContext.tsx   # Printer state management
├── services/
│   └── BluetoothPrinterService.ts  # Bluetooth printer service
├── assets/
│   └── images/
├── package.json
└── README.md
```

## Navigation Structure

- **Sign-in** (`/`) → Agent login with username/password or OTP
- **Tabs** (`/(tabs)`)
  - **Home** - Dashboard with collections and transactions
  - **Users** - Customer list with search and filters
  - **New Deposits** - Daily deposit entry form
  - **Support** - Help and support resources
- **User Detail** (`/userDetail`) - Individual customer deposit page
- **Printer Settings** (`/printer`) - Bluetooth printer management (modal)

## Key Features Details

### Bluetooth Printer Integration

The app includes robust Bluetooth printer integration with:

- Device scanning and pairing
- Connection management
- Receipt printing for ESCPOS thermal printers
- Defensive error handling (app won't crash if Bluetooth unavailable)

### Material Design 3 Theme

Custom theme with:

- Primary Color: `#4A90E2` (Blue)
- Secondary Color: `#5856D6` (Purple)
- Roboto font family (Regular, Medium, Bold)
- Consistent elevation and border radius

### Safe Area Handling

All screens use `react-native-safe-area-context` to prevent content overlap with device notches and status bars.

## Development

### Hot Reload

- Code changes automatically reload in the app
- Fast refresh for React components

### Clean Build

If you encounter build issues:

```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Debugging

- Use React Native Debugger or Chrome DevTools
- View logs in Metro bundler terminal
- Check Android logcat: `adb logcat`

## Known Issues & Solutions

### Bluetooth Module Warnings

You may see warnings like:

```
WARN  Bluetooth printer module not available
```

This is expected and handled gracefully. The app has defensive checks and won't crash if Bluetooth is unavailable.

### Gradle Build Issues

The app includes patches for Expo Dev Client:

```json
"expo-dev-client": "~5.0.36+android-gradle-8.14.3"
```

This ensures compatibility with Gradle 8.14.3.

## Build for Production

To create a production APK:

```bash
eas build --platform android --profile production
```

(Requires EAS CLI: `npm install -g eas-cli`)

## Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (requires macOS)
- `npm run web` - Run in web browser
- `npm test` - Run tests

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:

- 📧 Email support
- 📞 Call support
- 🎫 Submit a ticket through the app's Support tab

## Acknowledgments

- Built with [Expo](https://expo.dev)
- UI components from [React Native Paper](https://callstack.github.io/react-native-paper/)
- Bluetooth printing via [react-native-bluetooth-escpos-printer](https://github.com/januslo/react-native-bluetooth-escpos-printer)
