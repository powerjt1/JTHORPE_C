#!/bin/bash

# Power Platform Skills Installation Script
# Downloads and executes the official Microsoft Power Platform skills installer

echo "🚀 Installing Microsoft Power Platform Skills..."

INSTALL_SCRIPT_URL="https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js"

curl -fsSL "$INSTALL_SCRIPT_URL" | node

if [ $? -eq 0 ]; then
  echo "✅ Power Platform Skills installed successfully!"
else
  echo "❌ Power Platform Skills installation failed!"
  exit 1
fi
