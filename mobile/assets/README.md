# Assets Directory

This directory contains all static assets for the Hawklets Fitness mobile app.

## Required Assets

### 1. App Icons
- `icon.png` - Primary app icon (1024x1024)
- `adaptive-icon.png` - Android adaptive icon (foreground)
- `favicon.png` - Web favicon (32x32)

### 2. Splash Screen
- `splash.png` - App splash screen (1242x2436 for iOS, 1920x1080 for Android)

### 3. UI Assets
- `avatar.png` - Default user avatar
- `workout-placeholder.png` - Placeholder for workout images
- `achievement-badge.png` - Achievement badge graphics

## Asset Specifications

### App Icon
- **Format**: PNG with transparency
- **Size**: 1024x1024 pixels
- **Background**: Transparent or brand color (#4CAF50)
- **Design**: Simple, recognizable fitness-related icon

### Splash Screen
- **Format**: PNG
- **Size**: 1242x2436 pixels (iPhone) or 1920x1080 pixels (Android)
- **Content**: App logo centered on brand background
- **Background Color**: #4CAF50 (brand green)

### Default Avatar
- **Format**: PNG
- **Size**: 256x256 pixels
- **Design**: Generic user silhouette or fitness avatar

## Generating Assets

Use tools like:
- [App Icon Generator](https://appicon.co/)
- [MakeAppIcon](https://makeappicon.com/)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)

## Placeholder Assets

For development, you can use placeholder images from:
- [Unsplash](https://unsplash.com/) - Free high-quality photos
- [Pexels](https://www.pexels.com/) - Free stock photos
- [Flaticon](https://www.flaticon.com/) - Free icons

## Production Assets

Replace placeholder assets with branded assets before production deployment.

## Asset Optimization

1. **Compress images** using tools like:
   - [TinyPNG](https://tinypng.com/)
   - [ImageOptim](https://imageoptim.com/)

2. **Use appropriate formats**:
   - PNG for icons with transparency
   - JPEG for photos
   - SVG for vector graphics (when supported)

3. **Optimize for screen densities**:
   - Create @1x, @2x, @3x versions for iOS
   - Create mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi for Android