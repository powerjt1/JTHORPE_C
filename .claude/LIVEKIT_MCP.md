# LiveKit MCP Server Installation

This project is configured to use the LiveKit MCP (Model Context Protocol) server.

## Setup

1. **Install LiveKit MCP Server**:
   ```bash
   npm install @livekit/mcp-server
   ```

2. **Configure Credentials**:
   - Copy `.claude/.env.example` to `.claude/.env`
   - Fill in your LiveKit server credentials:
     - `LIVEKIT_URL`: Your LiveKit server URL
     - `LIVEKIT_API_KEY`: Your LiveKit API key
     - `LIVEKIT_API_SECRET`: Your LiveKit API secret

3. **Load Environment Variables**:
   The MCP server will automatically read the environment variables from `.env` file.

## Features

The LiveKit MCP server provides tools and resources for:
- Managing LiveKit rooms
- Creating and managing video/audio sessions
- Accessing LiveKit API functionality
- Real-time communication capabilities

## Documentation

For more information about LiveKit MCP, visit:
- [LiveKit MCP Repository](https://github.com/livekit/mcp)
- [LiveKit Documentation](https://docs.livekit.io)

## Troubleshooting

- Make sure your LiveKit server is running and accessible at the configured URL
- Verify that your API credentials are correct
- Check that the environment variables are properly loaded
