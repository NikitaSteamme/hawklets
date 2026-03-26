#!/bin/bash

# Shell script to build Android APK for Hawklets Fitness app
# This script builds a development APK that can be installed on Android devices

echo "=== Hawklets Fitness Android APK Builder ==="
echo "Building development APK for testing on Samsung Galaxy S24 Ultra..."

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required. Please install it first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Error: npm is required. Please install it first."
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install dependencies if needed
echo -e "\nChecking dependencies..."
npm install

# Clean previous builds
echo -e "\nCleaning previous builds..."
if [ -d "android/app/build/outputs/apk/debug" ]; then
    rm -f android/app/build/outputs/apk/debug/*.apk
fi

# Build the Android APK
echo -e "\nBuilding Android APK (this may take several minutes)..."
echo "Please be patient as this process downloads Gradle dependencies and builds the app."

# Run the Android build using Expo
npx expo run:android --variant debug --no-install

if [ $? -eq 0 ]; then
    echo -e "\n=== BUILD COMPLETE ==="
    
    # Find the generated APK
    APK_FILE=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -1)
    
    if [ -f "$APK_FILE" ]; then
        APK_SIZE=$(du -h "$APK_FILE" | cut -f1)
        echo -e "\nAPK generated successfully!"
        echo "APK location: $APK_FILE"
        echo "APK size: $APK_SIZE"
        
        echo -e "\n=== INSTALLATION INSTRUCTIONS ==="
        echo "1. Copy the APK file to your Samsung Galaxy S24 Ultra:"
        echo "   - Connect your phone via USB"
        echo "   - Enable 'File Transfer' mode"
        echo "   - Copy the APK file to your phone's Downloads folder"
        echo ""
        echo "2. On your phone:"
        echo "   - Open Files app"
        echo "   - Navigate to Downloads folder"
        echo "   - Tap on the APK file to install"
        echo "   - Allow installation from unknown sources if prompted"
        echo ""
        echo "3. Launch the app:"
        echo "   - Find 'Hawklets Fitness' in your app drawer"
        echo "   - Open and test all features"
        
        echo -e "\n=== TROUBLESHOOTING ==="
        echo "- If build fails, ensure you have Android SDK installed"
        echo "- Make sure USB debugging is enabled on your phone"
        echo "- Check that you have enough storage space on your device"
    else
        echo "Error: APK file not found. Build may have failed."
        echo "Check the build output above for errors."
    fi
else
    echo -e "\nError during build process."
    echo -e "\nPlease check:"
    echo "1. Android SDK is installed and configured"
    echo "2. JAVA_HOME environment variable is set"
    echo "3. You have enough disk space"
    exit 1
fi

echo -e "\n=== NEXT STEPS ==="
echo "To run the app in development mode with live reload:"
echo "  npx expo start --android"
echo ""
echo "To build a release APK for distribution:"
echo "  npx expo run:android --variant release"