# Navigation Structure

## App Flow

### 1. Sign In Page (`/app/index.tsx`)

- **Route**: `/` (root)
- **Features**:
  - Username and password input fields using React Native Paper
  - Material Design 3 styled components
  - Sign-in button that redirects to Dashboard
  - Currently has mock authentication (no actual validation)

### 2. Tabs Layout (`/app/(tabs)/_layout.tsx`)

- **Route**: `/(tabs)`
- **Features**:
  - Bottom tab navigation with 3 tabs
  - Material Community Icons for tab icons
  - Custom styling with brand colors
  - Roboto fonts applied

### 3. Tab Screens

#### Dashboard (`/app/(tabs)/dashboard.tsx`)

- **Route**: `/(tabs)/dashboard`
- **Features**:
  - Welcome message
  - Printer status card showing connection state
  - Quick stats (receipts count, active users)
  - Quick action buttons to navigate to other screens
  - Full integration with PrinterContext

#### Users (`/app/(tabs)/users.tsx`)

- **Route**: `/(tabs)/users`
- **Features**:
  - Search bar to filter users
  - User statistics cards (total, active)
  - List of users with avatars and status badges
  - Floating Action Button (FAB) to add new users
  - Mock data with 3 sample users

#### Reports (`/app/(tabs)/reports.tsx`)

- **Route**: `/(tabs)/reports`
- **Features**:
  - Segmented buttons to switch between Daily/Monthly view
  - Total collections summary card
  - Breakdown with visual progress bars
  - Statistical cards (Average, Highest, Lowest)
  - Export report button
  - Mock data with sample collections

### 4. Additional Screens

#### Printer Settings (`/app/printer.tsx`)

- **Route**: `/printer`
- **Presentation**: Modal
- **Features**:
  - Full printer management interface
  - Device scanning and connection
  - Receipt printing functionality

## Navigation Flow

```
Sign In (/)
    ↓
Dashboard (/(tabs)/dashboard)
    ├─ Navigate to Users
    ├─ Navigate to Reports
    └─ Navigate to Printer Settings (modal)
```

## Components Used

### React Native Paper Components

- `Button` - Primary and outlined variants
- `Card` - Container for grouped content
- `Text` - Typography with variants
- `TextInput` - Form inputs with icons
- `List.Item` - User list entries
- `Avatar.Text` - User initials
- `Searchbar` - User search
- `FAB` - Floating action button
- `SegmentedButtons` - Period selector
- `IconButton` - Action buttons
- `Divider` - Visual separators

### Icons

- Material Community Icons from `react-native-vector-icons`
- Used in tabs, buttons, and list items

## Styling

### Theme

- Primary Color: `#007AFF`
- Secondary Color: `#5856D6`
- Success Color: `#4CAF50`
- Warning Color: `#FF9800`

### Fonts

- Regular: Roboto_400Regular
- Medium: Roboto_500Medium
- Bold: Roboto_700Bold

## Future Enhancements

### Sign In

- [ ] Add actual authentication logic
- [ ] Form validation
- [ ] Remember me functionality
- [ ] Password reset link
- [ ] Error handling for invalid credentials

### Dashboard

- [ ] Real-time data from backend
- [ ] More detailed statistics
- [ ] Recent activity feed
- [ ] Notifications

### Users

- [ ] Add user functionality
- [ ] Edit user details
- [ ] Delete user confirmation
- [ ] Role management
- [ ] Activity history
- [ ] Backend API integration

### Reports

- [ ] More chart types (pie, line charts)
- [ ] Date range picker
- [ ] PDF export functionality
- [ ] Email reports
- [ ] Filter options
- [ ] Backend API integration

### General

- [ ] Logout functionality
- [ ] Settings page
- [ ] Profile page
- [ ] Dark mode support
- [ ] Offline data persistence
- [ ] Push notifications
- [ ] Backend integration
