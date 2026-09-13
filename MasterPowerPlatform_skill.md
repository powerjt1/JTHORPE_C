# MasterPowerPlatform Skill

## Overview

The **MasterPowerPlatform Skill** enables AI agents to automate Microsoft Power Platform operations including Power Apps, Power Automate, Power BI, and Dataverse through a combination of:

- **Power Platform Skills**: Microsoft's official Power Platform integration layer
- **Playwright Browser Automation**: Web-based task automation and form completion
- **LiveKit MCP**: Real-time communication capabilities
- **Agent Browser**: Autonomous web navigation and obstacle handling

This skill transforms the agent into a Power Platform automation specialist capable of completing complex enterprise workflows.

---

## Core Capabilities

### 1. Power Automate Workflows
- Create and trigger cloud flows
- Run desktop flows (RPA)
- Manage flow approvals
- Monitor and troubleshoot flow executions
- Access flow history and analytics

### 2. Power Apps Automation
- Navigate and interact with canvas apps
- Fill forms and submit data
- Trigger app actions programmatically
- Validate app behavior and state
- Capture screenshots for verification

### 3. Power BI Operations
- Create and manage reports
- Refresh datasets
- Generate dashboards
- Export data and reports
- Configure data connections

### 4. Dataverse Management
- Create, read, update, delete records
- Manage tables and columns
- Execute business logic through flows
- Handle complex relationships
- Bulk data operations

### 5. Web-Based Automation (via Playwright)
- Navigate Power Platform web interfaces
- Complete multi-step workflows
- Handle dynamic content and modals
- Bypass obstacles and popups
- Execute JavaScript on pages

---

## Installation & Setup

### Prerequisites
```bash
# Node.js 18+
node --version

# npm or yarn
npm --version
```

### Step 1: Install Dependencies
```bash
npm install
npm run install-browsers
```

### Step 2: Configure Environment
```bash
# Copy environment template
cp .claude/.env.example .claude/.env

# Edit .claude/.env and add:
# LIVEKIT_URL=your_livekit_server
# LIVEKIT_API_KEY=your_api_key
# LIVEKIT_API_SECRET=your_api_secret
```

### Step 3: Install Power Platform Skills
```bash
# Option 1: Node.js script
node scripts/install-power-platform-skills.js

# Option 2: Shell script
bash scripts/install-power-platform-skills.sh

# Option 3: Direct curl
curl -fsSL https://raw.githubusercontent.com/microsoft/power-platform-skills/main/scripts/install.js | node
```

### Step 4: Verify Installation
```bash
# Check MCP servers are loaded
npm start

# Test Power Platform connectivity
```

---

## Usage Patterns

### Pattern 1: Automated Power Automate Workflow Execution

**Scenario**: Trigger a cloud flow with specific inputs and wait for completion

```markdown
Task: Execute "Approval Process" flow with these inputs:
- Document ID: DOC123
- Department: Finance
- Approver Email: manager@company.com

Expected outcome:
- Flow triggered successfully
- Approval request sent
- Status tracked until completion
```

**Agent Actions**:
1. Use Power Automate MCP to trigger the flow
2. Wait for execution status updates
3. Handle approval notifications via LiveKit
4. Document completion status

### Pattern 2: Power Apps Form Completion

**Scenario**: Complete a complex multi-screen Power App form

```markdown
Task: Complete "Customer Onboarding" app:
1. Screen 1: Enter basic customer info
2. Screen 2: Upload documents
3. Screen 3: Review and submit
4. Verify confirmation message
```

**Agent Actions**:
1. Navigate to Power App URL with Playwright
2. Fill each form screen
3. Handle file uploads
4. Take screenshots for verification
5. Submit and validate completion

### Pattern 3: Dataverse Bulk Data Import

**Scenario**: Import customer data into Dataverse

```markdown
Task: Import 1000 customer records into Dataverse:
- Source: Excel file
- Table: Accounts
- Action: Create new records
- Validate: No duplicates
```

**Agent Actions**:
1. Use Dataverse API via Power Platform Skills
2. Transform and validate data
3. Execute bulk create operation
4. Monitor import progress
5. Report results and errors

### Pattern 4: Power BI Report Generation

**Scenario**: Create and schedule a daily report

```markdown
Task: Generate "Sales Dashboard" report:
- Refresh all datasets
- Create summary visuals
- Export to PDF
- Email to stakeholders
```

**Agent Actions**:
1. Connect to Power BI via Power Platform Skills
2. Trigger dataset refresh
3. Generate report snapshots
4. Handle exports
5. Integrate with email via Power Automate

### Pattern 5: Multi-Step Workflow with Web Interaction

**Scenario**: Approval workflow with web-based signoff

```markdown
Task: Execute approval workflow with web signature:
1. Create approval request in Power Automate
2. Send link to approver
3. Navigate to approval page with Playwright
4. Complete signature capture
5. Trigger downstream automation
```

**Agent Actions**:
1. Create Power Automate flow
2. Wait for approver availability
3. Use Playwright to interact with approval UI
4. Handle signature canvas
5. Complete flow execution

---

## Integration Points

### With Playwright MCP
```json
{
  "workflow": "ComplexApproval",
  "steps": [
    {
      "type": "playwright",
      "action": "navigate",
      "url": "https://apps.powerapps.com/..."
    },
    {
      "type": "playwright",
      "action": "fill_form",
      "fields": { "name": "value" }
    },
    {
      "type": "power-automate",
      "action": "trigger_flow"
    }
  ]
}
```

### With LiveKit MCP
```json
{
  "communication": {
    "enabled": true,
    "notification": "ApprovalRequired",
    "participants": ["approver@company.com"],
    "protocol": "livekit"
  }
}
```

---

## Advanced Scenarios

### Scenario 1: Autonomous RPA Process
- Desktop flow execution via Power Automate
- Legacy system automation
- Data migration workflows
- Scheduled automation

### Scenario 2: Intelligent Document Processing
- Power Apps form filling from documents
- OCR and validation
- Dataverse record creation
- Exception handling

### Scenario 3: Multi-Tenant Workflow Orchestration
- Cross-tenant Power Automate flows
- Dataverse sync across instances
- Compliance and audit logging
- Error tracking and recovery

### Scenario 4: Real-Time Collaboration
- LiveKit integration for approvals
- Power Automate notifications
- Multi-user workflow coordination
- Decision branching based on live feedback

### Scenario 5: Continuous Data Synchronization
- Monitor Dataverse changes
- Trigger automated workflows
- Update Power BI dashboards
- Maintain data consistency

---

## Configuration Options

### Power Platform Connection
```json
{
  "environment": "prod",
  "tenant": "your-tenant.onmicrosoft.com",
  "region": "US",
  "authentication": "oauth2"
}
```

### Playwright Browser Settings
```json
{
  "playwright": {
    "headless": true,
    "browser": "chromium",
    "timeout": 30000,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### Timeout & Retry Strategy
```json
{
  "timeouts": {
    "flow_execution": 300000,
    "page_navigation": 30000,
    "element_wait": 10000
  },
  "retry": {
    "max_attempts": 3,
    "backoff_ms": 1000
  }
}
```

---

## Error Handling

### Common Issues & Solutions

#### Power Automate Flow Timeout
**Issue**: Flow execution exceeds expected time  
**Solution**: Check flow logs, increase timeout, optimize flow logic

#### Power App Form Validation
**Issue**: Form submission fails validation  
**Solution**: Validate data before submission, check validation rules

#### Dataverse Connection Errors
**Issue**: Cannot connect to Dataverse  
**Solution**: Verify authentication, check environment permissions

#### Playwright Navigation Issues
**Issue**: Page elements not found or interactions fail  
**Solution**: Use wait conditions, handle dynamic content, check selectors

#### LiveKit Connection Loss
**Issue**: Real-time communication disconnects  
**Solution**: Implement retry logic, check network, verify credentials

---

## Monitoring & Troubleshooting

### Enable Debug Logging
```bash
export DEBUG=power-platform:*
npm start
```

### Check MCP Server Status
```bash
# Verify all MCPs are running
curl http://localhost:8000/status

# Check Power Platform Skills installation
npm list @microsoft/power-platform-skills
```

### Monitor Flow Execution
```bash
# View flow run history
# Via Power Automate UI or Power Platform Skills API
```

### Browser Automation Logs
```bash
# Enable Playwright debugging
export DEBUG=pw:api
npm start
```

---

## Best Practices

1. **Validation**: Always validate data before operations
2. **Error Recovery**: Implement retry logic for transient failures
3. **Logging**: Log all operations for audit trails
4. **Permissions**: Use least-privilege service accounts
5. **Testing**: Test workflows in dev before production
6. **Monitoring**: Set up alerts for critical flows
7. **Documentation**: Document complex workflow logic
8. **Performance**: Optimize for speed and resource usage

---

## Security Considerations

### Credentials Management
- Store Power Platform credentials in `.env` (not in code)
- Use service principal accounts for automation
- Rotate API keys regularly
- Enable multi-factor authentication

### Access Control
- Limit flow permissions to required operations
- Use row-level security in Dataverse
- Audit all automated operations
- Monitor for unusual activity

### Data Privacy
- Encrypt sensitive data in transit
- Comply with data retention policies
- Mask PII in logs
- Implement data deletion workflows

---

## Documentation References

- [Power Platform Documentation](https://learn.microsoft.com/power-platform/)
- [Power Automate Cloud Flows](https://learn.microsoft.com/power-automate/cloud/)
- [Power Apps Development](https://learn.microsoft.com/power-apps/)
- [Dataverse Documentation](https://learn.microsoft.com/power-apps/developer/data-platform/)
- [Power Platform Skills Repository](https://github.com/microsoft/power-platform-skills)
- [Playwright Documentation](https://playwright.dev)
- [LiveKit Documentation](https://docs.livekit.io)

---

## Support & Community

- **Microsoft Learn**: https://learn.microsoft.com/power-platform/
- **GitHub Issues**: Report issues on skill repository
- **Community Forums**: Power Platform Community
- **Stack Overflow**: Tag questions with `power-automate`, `power-apps`, `dataverse`

---

## Version History

### v1.0.0 (Current)
- Initial release with Power Platform Skills integration
- Playwright browser automation support
- LiveKit MCP integration
- Comprehensive automation capabilities

---

## License

This skill is part of the Master Power Platform automation suite.

---

## Last Updated
September 13, 2026

## Maintained By
Claude Haiku 4.5
