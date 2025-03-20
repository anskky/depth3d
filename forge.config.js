const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'src/icons/icon')
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'anskky',
        icon: './src/icons/icon.ico',
        setupIcon: './src/icons/icon.ico',
        loadingGif: './src/icons/icon_1024x1024_scaled.gif',
        name: "depth3d",
        setupExe: 'depth3d_installation.exe',
        shortcutName: "depth3d",
        skipUpdateIcon: true,
        createDesktopShortcut: true
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        title: 'depth3d',
        authors: 'anskky',
        homepage: 'https://github.com/anskky/depth3d',
        icon: './src/icons/icon.icns'
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          name: 'depth3d',
          author: 'anskky',
          homepage: 'https://github.com/anskky/depth3d',
          icon: './src/icons/icon.png'
        }
      }
    },
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {
    //     options: {
    //       options: {
    //         name: 'depth3d',
    //         author: 'anskky',
    //         homepage: 'https://github.com/anskky/depth3d',
    //         icon: './src/icons/icon.png'
    //       }
    //     }
    //   }
    // },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
