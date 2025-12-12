# React Native Paper Setup Guide

## Installed Packages

- **react-native-paper** - Material Design 3 UI components
- **react-native-safe-area-context** - Required peer dependency
- **react-native-vector-icons** - Icon library
- **@expo-google-fonts/roboto** - Google Roboto font family
- **expo-font** - Font loading utilities

## Configuration

### 1. App Layout (\_layout.tsx)

The app is configured with:

- `PaperProvider` wrapping the entire app
- Custom Material Design 3 theme with:
  - Primary color: #007AFF
  - Secondary color: #5856D6
  - Roboto fonts configured for all text styles
- Font loading with splash screen management

### 2. Fonts

Loaded fonts:

- `Roboto_400Regular` - Body text
- `Roboto_500Medium` - Labels and medium emphasis text
- `Roboto_700Bold` - Headings and high emphasis text

### 3. Android Configuration

- Vector icons configured in `android/app/build.gradle`
- Fonts automatically linked via expo-font plugin

## Usage Examples

### Using Paper Components

```tsx
import { Button, Card, Text, TextInput } from 'react-native-paper';

// Button with Paper styling
<Button mode="contained" onPress={handlePress}>
  Click Me
</Button>

// Text with automatic font
<Text variant="headlineMedium">Heading Text</Text>
<Text variant="bodyMedium">Body text with Roboto font</Text>

// Card component
<Card>
  <Card.Title title="Card Title" subtitle="Card Subtitle" />
  <Card.Content>
    <Text variant="bodyMedium">Card content goes here</Text>
  </Card.Content>
  <Card.Actions>
    <Button>Cancel</Button>
    <Button>Ok</Button>
  </Card.Actions>
</Card>

// Text Input
<TextInput
  label="Email"
  value={email}
  onChangeText={setEmail}
  mode="outlined"
/>
```

### Available Text Variants

- `displayLarge`, `displayMedium`, `displaySmall`
- `headlineLarge`, `headlineMedium`, `headlineSmall`
- `titleLarge`, `titleMedium`, `titleSmall`
- `bodyLarge`, `bodyMedium`, `bodySmall`
- `labelLarge`, `labelMedium`, `labelSmall`

### Using Icons

```tsx
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

<Icon name="printer" size={24} color="#007AFF" />;
```

## Rebuilding the App

After setup, rebuild the app for changes to take effect:

```bash
# For Android
npx expo run:android --device

# Or for development build
npm start
```

## Next Steps

You can now use any React Native Paper component throughout your app:

- Replace standard React Native components with Paper equivalents
- Use the theme colors automatically
- All text will use Roboto fonts
- Material Design 3 styling will be applied

## Documentation

- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [Material Design 3](https://m3.material.io/)
- [Expo Google Fonts](https://github.com/expo/google-fonts)
