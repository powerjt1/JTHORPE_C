# Playwright MCP Server Installation

This project is configured to use the Playwright MCP (Model Context Protocol) server for agent-based web browsing and automation.

## Overview

The Playwright MCP enables AI agents to:
- Navigate and interact with web pages
- Handle JavaScript-heavy applications
- Fill and submit forms
- Take screenshots for verification
- Handle dynamic content and obstacles
- Complete complex web tasks autonomously

## Setup

1. **Install Playwright MCP Server**:
   ```bash
   npm install @anthropic-ai/playwright-mcp
   ```

2. **Install Playwright Browsers** (if not already installed):
   ```bash
   npx playwright install chromium
   ```

3. **Optional: Configure Environment Variables**:
   - `PLAYWRIGHT_HEADLESS`: Run in headless mode (default: true)
   - `PLAYWRIGHT_BROWSER_TYPE`: Browser type to use (default: chromium)
   - `PLAYWRIGHT_TIMEOUT`: Global timeout in milliseconds (default: 30000)

## Features

The Playwright MCP provides tools for:
- **Navigation**: Go to URLs, handle redirects
- **Interaction**: Click elements, fill forms, type text
- **Inspection**: Get page content, element properties, screenshots
- **Waiting**: Wait for elements, navigation, conditions
- **Execution**: Run JavaScript in page context
- **Screenshot**: Capture full pages or specific elements
- **Cookie/Storage**: Manage browser state

## Browser Configuration

By default, Playwright is configured to use:
- **Browser**: Chromium (most compatible)
- **Mode**: Headless (can be disabled for debugging)
- **Resolution**: 1920x1080

## Common Tasks

### Navigate to a website
The agent can now navigate to websites and extract information automatically.

### Complete forms
Fill form fields and submit them, with proper handling of validation.

### Handle JavaScript
Interact with single-page applications (SPAs) and dynamically loaded content.

### Bypass obstacles
Handle pop-ups, modals, CAPTCHA detection, and other common web obstacles.

## Advantages Over Chrome Extension

- **Full automation**: Complete control over browser actions
- **Obstacle handling**: Better equipped to handle anti-bot measures
- **JavaScript execution**: Can execute and wait for dynamic content
- **Headless operation**: Runs without visible browser window
- **Faster execution**: Optimized for agent-based automation
- **Better reliability**: Programmatic API vs extension limitations

## Documentation

For more information:
- [Playwright Documentation](https://playwright.dev)
- [Anthropic Playlist MCP](https://github.com/anthropic-ai/playwright-mcp)

## Troubleshooting

- **Browser crashes**: Ensure sufficient memory and disk space
- **Timeouts**: Increase `PLAYWRIGHT_TIMEOUT` if pages load slowly
- **JavaScript errors**: Check browser console via screenshots
- **Element not found**: Use wait conditions before interactions
- **Performance**: Use headless mode for faster execution

## Performance Tips

1. Use headless mode for production agents
2. Set appropriate timeouts based on page complexity
3. Use specific selectors to improve performance
4. Close pages and contexts after use
5. Monitor memory usage for long-running sessions
