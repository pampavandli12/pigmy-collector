const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidBackupDisabled(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:allowBackup'] = 'false';
    }
    return config;
  });
}

module.exports = withAndroidBackupDisabled;
