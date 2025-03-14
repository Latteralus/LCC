/**
 * build.js
 * Build script for the Macro Automation Tool electron application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { platform } = process;
const electronBuilder = require('electron-builder');

// Configuration
const CONFIG = {
  appId: 'com.macro-automation-tool.app',
  productName: 'Macro Automation Tool',
  buildDir: 'build',
  distDir: 'dist',
  platforms: getPlatforms(),
  packageManager: getPackageManager(),
  versionType: getVersionType(process.argv)
};

/**
 * Get target platforms based on arguments or current platform
 * 
 * @returns {Array} List of platforms to build for
 */
function getPlatforms() {
  const platforms = [];
  const args = process.argv.slice(2);

  // Check for platform arguments
  if (args.includes('--win')) {
    platforms.push('win');
  }
  if (args.includes('--mac')) {
    platforms.push('mac');
  }
  if (args.includes('--linux')) {
    platforms.push('linux');
  }

  // If no platforms specified, use current platform
  if (platforms.length === 0) {
    switch (platform) {
      case 'win32':
        platforms.push('win');
        break;
      case 'darwin':
        platforms.push('mac');
        break;
      case 'linux':
        platforms.push('linux');
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  return platforms;
}

/**
 * Get the package manager in use (npm or yarn)
 * 
 * @returns {string} Package manager name
 */
function getPackageManager() {
  try {
    // Check if yarn.lock exists
    if (fs.existsSync(path.join(__dirname, 'yarn.lock'))) {
      return 'yarn';
    }
    return 'npm';
  } catch (err) {
    return 'npm'; // Default to npm
  }
}

/**
 * Get version type based on arguments (patch, minor, major)
 * 
 * @param {Array} args - Command line arguments
 * @returns {string|null} Version type or null if not specified
 */
function getVersionType(args) {
  if (args.includes('--patch')) {
    return 'patch';
  }
  if (args.includes('--minor')) {
    return 'minor';
  }
  if (args.includes('--major')) {
    return 'major';
  }
  return null;
}

/**
 * Clean build and dist directories
 */
function clean() {
  console.log('🧹 Cleaning build and dist directories...');
  
  // Create directories if they don't exist
  [CONFIG.buildDir, CONFIG.distDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Clean directories by removing content but keeping the directory
  [CONFIG.buildDir, CONFIG.distDir].forEach(dir => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  });
  
  console.log('✅ Directories cleaned successfully');
}

/**
 * Bump version in package.json
 */
function bumpVersion() {
  if (!CONFIG.versionType) {
    console.log('ℹ️ Skipping version bump (no version type specified)');
    return;
  }
  
  console.log(`🔄 Bumping ${CONFIG.versionType} version...`);
  
  try {
    const packageManager = CONFIG.packageManager;
    const command = packageManager === 'yarn' 
      ? `yarn version --${CONFIG.versionType} --no-git-tag-version` 
      : `npm version ${CONFIG.versionType} --no-git-tag-version`;
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Version bumped successfully');
  } catch (err) {
    console.error('❌ Failed to bump version:', err.message);
    process.exit(1);
  }
}

/**
 * Run linting
 */
function lint() {
  console.log('🔍 Running linting...');
  
  try {
    const packageManager = CONFIG.packageManager;
    const command = packageManager === 'yarn' ? 'yarn lint' : 'npm run lint';
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Linting completed successfully');
  } catch (err) {
    console.error('❌ Linting failed:', err.message);
    process.exit(1);
  }
}

/**
 * Run tests
 */
function test() {
  if (process.argv.includes('--skip-tests')) {
    console.log('ℹ️ Skipping tests');
    return;
  }
  
  console.log('🧪 Running tests...');
  
  try {
    const packageManager = CONFIG.packageManager;
    const command = packageManager === 'yarn' ? 'yarn test' : 'npm test';
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ Tests completed successfully');
  } catch (err) {
    console.error('❌ Tests failed:', err.message);
    process.exit(1);
  }
}

/**
 * Generate default config file if it doesn't exist
 */
function generateDefaultConfig() {
  console.log('📝 Generating default configuration...');
  
  const configDir = path.join(__dirname, 'config');
  const defaultConfigPath = path.join(configDir, 'default-config.json');
  
  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Get default config from types
  try {
    const configTypes = require('./types/config-types');
    const defaultConfig = configTypes.DEFAULT_CONFIG;
    
    // Add metadata
    const configWithMetadata = {
      ...defaultConfig,
      updatedAt: new Date().toISOString()
    };
    
    // Write to file
    fs.writeFileSync(
      defaultConfigPath,
      JSON.stringify(configWithMetadata, null, 2),
      'utf-8'
    );
    
    console.log('✅ Default configuration generated successfully');
  } catch (err) {
    console.error('❌ Failed to generate default configuration:', err.message);
    process.exit(1);
  }
}

/**
 * Run electron-builder to package the app
 */
async function build() {
  console.log('🏗️ Building application packages...');
  
  try {
    // Create platform-specific build configurations
    const platformConfigs = CONFIG.platforms.map(platform => {
      const targets = [];
      
      switch (platform) {
        case 'win':
          targets.push(electronBuilder.Platform.WINDOWS.createTarget(['nsis', 'portable']));
          break;
        case 'mac':
          targets.push(electronBuilder.Platform.MAC.createTarget(['dmg', 'zip']));
          break;
        case 'linux':
          targets.push(electronBuilder.Platform.LINUX.createTarget(['AppImage', 'deb']));
          break;
      }
      
      return targets;
    }).flat();
    
    // Build configuration
    const buildConfig = {
      config: {
        appId: CONFIG.appId,
        productName: CONFIG.productName,
        directories: {
          output: CONFIG.distDir,
          buildResources: 'assets'
        },
        // Include files from package.json build field
        // Files not excluded that will be included
        files: [
          "**/*",
          "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
          "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
          "!**/node_modules/*.d.ts",
          "!**/node_modules/.bin",
          "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
          "!.editorconfig",
          "!**/._*",
          "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
          "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
          "!**/{appveyor.yml,.travis.yml,circle.yml}",
          "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
        ],
        // Platform-specific configurations
        win: {
          target: ['nsis', 'portable'],
          icon: 'assets/icons/app-icon.ico'
        },
        mac: {
          target: ['dmg', 'zip'],
          icon: 'assets/icons/app-icon.icns',
          category: 'public.app-category.productivity'
        },
        linux: {
          target: ['AppImage', 'deb'],
          icon: 'assets/icons/app-icon.png',
          category: 'Utility'
        },
        // NSIS installer configuration
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          runAfterFinish: true
        }
      },
      targets: platformConfigs
    };
    
    // Start the build process
    await electronBuilder.build(buildConfig);
    
    console.log('✅ Application packages built successfully');
  } catch (err) {
    console.error('❌ Build failed:', err.message);
    process.exit(1);
  }
}

/**
 * Create necessary icons if they don't exist
 */
function createIcons() {
  console.log('🖼️ Checking application icons...');
  
  const iconDir = path.join(__dirname, 'assets', 'icons');
  
  // Ensure icon directory exists
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  
  // Check for required icon files
  const requiredIcons = [
    { path: path.join(iconDir, 'app-icon.png'), dim: '512x512' },
    { path: path.join(iconDir, 'tray-icon.png'), dim: '32x32' }
  ];
  
  let missingIcons = false;
  for (const icon of requiredIcons) {
    if (!fs.existsSync(icon.path)) {
      console.warn(`⚠️ Missing icon: ${icon.path} (${icon.dim})`);
      missingIcons = true;
    }
  }
  
  if (missingIcons) {
    console.warn('⚠️ Please create the missing icons before packaging the application');
    // Implement icon generation here if needed
  } else {
    console.log('✅ All required icons found');
  }
}

/**
 * Run the build process
 */
async function runBuild() {
  try {
    // Start timing
    const startTime = Date.now();
    
    // Start build process
    console.log('🚀 Starting build process for Macro Automation Tool');
    console.log(`📋 Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
    
    // Run the build steps
    clean();
    bumpVersion();
    lint();
    test();
    generateDefaultConfig();
    createIcons();
    await build();
    
    // Calculate build time
    const buildTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 Build completed successfully in ${buildTime.toFixed(2)} seconds`);
    
  } catch (err) {
    console.error('❌ Build process failed:', err.message);
    process.exit(1);
  }
}

// Run the build process
runBuild().catch(err => {
  console.error('❌ Unhandled error in build process:', err);
  process.exit(1);
});