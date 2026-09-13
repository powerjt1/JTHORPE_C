# Power Platform Skills Setup

This document explains how to set up Microsoft Power Platform skills for this project.

## Overview

Microsoft Power Platform skills enable integration with Power Platform services including:
- Power Apps
- Power Automate
- Power BI
- Dataverse
- And more

## Installation

### Option 1: Using Node.js script

```bash
node scripts/install-power-platform-skills.js
```

### Option 2: Using shell script

```bash
bash scripts/install-power-platform-skills.sh
```

### Option 3: Direct curl command

```bash
curl -fsSL https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js | node
```

## Automatic Setup (CI/CD)

The Power Platform skills are automatically installed in the CI/CD pipeline via GitHub Actions workflow:
- **Workflow file**: `.github/workflows/setup-power-platform-skills.yml`
- **Triggers**: Push to main/master/develop, pull requests, or manual trigger

The workflow runs on every relevant change and ensures the development environment stays up-to-date with Power Platform skills.

## Verification

After installation, verify everything is working:

```bash
# The installation output will confirm successful setup
# You can verify by checking the installation output or attempting to use Power Platform features
```

## Troubleshooting

### Installation fails with network errors
- Check your internet connection
- Verify the Microsoft GitHub repository is accessible
- Try using a VPN if your network blocks GitHub

### Node.js version issues
- Ensure Node.js 18+ is installed: `node --version`
- Consider using Node Version Manager (nvm) to switch versions

### Permission errors
- On macOS/Linux, you may need to use `sudo` for global installations
- Alternatively, configure npm to use a local directory instead of global

## Documentation

For more information about Power Platform skills:
- [Microsoft Power Platform Documentation](https://learn.microsoft.com/power-platform/)
- [Power Platform Skills Repository](https://github.com/microsoft/power-platform-skills)

## Development

When developing features that use Power Platform skills:

1. Run the installation script to ensure latest skills are installed
2. Continue with your development workflow

## Notes

- The installation script is idempotent (safe to run multiple times)
- Power Platform skills will be updated with each installation
- No additional configuration is required after installation
