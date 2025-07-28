# PWA (Progressive Web App) Implementation

This project includes a dedicated PWA component that allows users to install the app on their devices.

## Components

### PWAProvider
Located at `src/components/PWAProvider.tsx`

This component:
- Detects if the app is already running in standalone mode (installed as PWA)
- Determines if the user is on a mobile device
- Manages the PWA install prompt state
- Wraps the app with PWA functionality

### InstallPWA
Located at `src/components/PWAInstall.tsx`

This component:
- Shows a modal prompt to install the PWA
- Handles the `beforeinstallprompt` event
- Provides installation instructions for different platforms
- Uses native HTML elements and Tailwind CSS for styling

## Features

### Automatic Detection
- Detects if the app is already installed as a PWA
- Identifies iOS and Samsung browsers for specific instructions
- Only shows the prompt on mobile devices

### Installation Flow
1. **Native Browser Prompt**: If the browser supports the `beforeinstallprompt` event, it shows a native install button
2. **Manual Instructions**: For iOS and other browsers, it provides manual installation instructions

### State Management
- Uses localStorage to remember if the user has dismissed the prompt
- Prevents showing the prompt repeatedly

## Usage

The PWA functionality is automatically enabled by wrapping the app with `PWAProvider` in the layout:

```tsx
<PWAProvider>
  {children}
  <MobileBottomNav />
  <Toaster />
</PWAProvider>
```

## Manifest

The PWA manifest is located at `public/manifest.json` and includes:
- App name and short name
- Theme colors
- App icon
- Display mode (standalone)
- Start URL with PWA parameter

## Testing

To test the PWA functionality:
1. Open the app in a mobile browser
2. The install prompt should appear automatically
3. For iOS, use Safari and follow the manual instructions
4. For Android, the native install prompt should appear

## Browser Support

- **Chrome/Edge**: Native install prompt
- **Safari (iOS)**: Manual instructions
- **Samsung Browser**: Manual instructions
- **Other browsers**: Manual instructions 
