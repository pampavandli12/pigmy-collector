#!/bin/bash

# Patch script for react-native-bluetooth-escpos-printer
# This fixes the jcenter repository issues and outdated SDK versions

BUILD_GRADLE="node_modules/react-native-bluetooth-escpos-printer/android/build.gradle"
JAVA_FILES="node_modules/react-native-bluetooth-escpos-printer/android/src/main/java/cn/jystudio/bluetooth"

echo "Patching react-native-bluetooth-escpos-printer..."

if [ -f "$BUILD_GRADLE" ]; then
    # Backup original file
    cp "$BUILD_GRADLE" "$BUILD_GRADLE.original" 2>/dev/null
    
    # Replace jcenter with mavenCentral and update URLs to HTTPS
    perl -i -pe 's|jcenter \{ url "http://jcenter\.bintray\.com/" \}|mavenCentral()|g' "$BUILD_GRADLE"
    perl -i -pe 's|maven \{url "http://repo\.spring\.io/plugins-release/"\}|maven {url "https://repo.spring.io/plugins-release/"}|g' "$BUILD_GRADLE"
    
    # Update gradle plugin version
    perl -i -pe "s|classpath 'com\.android\.tools\.build:gradle:3\.1\.4'|classpath 'com.android.tools.build:gradle:7.4.2'|g" "$BUILD_GRADLE"
    
    # Update SDK versions
    perl -i -pe 's|compileSdkVersion 27|compileSdkVersion 34|g' "$BUILD_GRADLE"
    perl -i -pe 's|buildToolsVersion "27\.0\.3"||g' "$BUILD_GRADLE"
    perl -i -pe 's|minSdkVersion 16|minSdkVersion 24|g' "$BUILD_GRADLE"
    perl -i -pe 's|targetSdkVersion 24|targetSdkVersion 34|g' "$BUILD_GRADLE"
    
    # Remove deprecated compile keyword and support library
    perl -i -pe 's|compile fileTree|implementation fileTree|g' "$BUILD_GRADLE"
    perl -i -pe "s|implementation group: 'com\.android\.support', name: 'support-v4', version: '27\.0\.0'||g" "$BUILD_GRADLE"
    
    # Migrate Java files from support library to AndroidX
    if [ -d "$JAVA_FILES" ]; then
        find "$JAVA_FILES" -type f -name "*.java" -exec perl -i -pe 's|android\.support\.v4\.content|androidx.core.content|g' {} \;
        find "$JAVA_FILES" -type f -name "*.java" -exec perl -i -pe 's|android\.support\.v4\.app|androidx.core.app|g' {} \;
    fi
    
    echo "✓ Patch applied successfully!"
else
    echo "✗ Build file not found. Make sure react-native-bluetooth-escpos-printer is installed."
    exit 1
fi
