#!/usr/bin/env node

/**
 * Power Platform Skills Installation Script
 * Downloads and executes the official Microsoft Power Platform skills installer
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import http from 'http';
import https from 'https';

const INSTALL_SCRIPT_URL = 'https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js';
const TEMP_SCRIPT = join(tmpdir(), 'power-platform-skills-install.js');

console.log('🚀 Installing Microsoft Power Platform Skills...');

const fetchScript = () => {
  return new Promise((resolve, reject) => {
    const protocol = INSTALL_SCRIPT_URL.startsWith('https') ? https : http;

    protocol.get(INSTALL_SCRIPT_URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download installer: HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
};

try {
  const script = await fetchScript();
  writeFileSync(TEMP_SCRIPT, script, { mode: 0o755 });

  console.log('📝 Running Power Platform Skills installer...');
  execSync(`node "${TEMP_SCRIPT}"`, { stdio: 'inherit' });

  console.log('✅ Power Platform Skills installed successfully!');
} catch (error) {
  console.error('❌ Installation failed:', error.message);
  process.exit(1);
}
