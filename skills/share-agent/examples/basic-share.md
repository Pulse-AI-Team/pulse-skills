# Example: Share Agent with an Investor

## Scenario
You're a founder preparing for a fundraise. You want to share your AI agent with potential investors so they can learn about your company before the first meeting.

## Step-by-step

### 1. Sync your investor materials
```
> "Sync all my files in ./investor-materials to Aicoo"
```
The agent reads files from `./investor-materials/` and uploads them to a "Investor Materials" folder on Aicoo.

### 2. Create a share link
```
> "Create a share link for investors, read-only, expires in 7 days"
```
The agent calls `POST /share/create` with:
```json
{
  "scope": "folders",
  "folderIds": ["<investor-materials-folder-id>"],
  "access": "read",
  "label": "For investors - Series A",
  "expiresIn": "7d"
}
```

### 3. Get the link
The agent returns:
```
Your shareable agent link:
https://www.aicoo.io/s/a1b2c3d4...

Anyone with this link can talk to your agent about your investor materials.
- Scope: Investor Materials folder only
- Access: Read-only (no calendar, no email)
- Expires: April 9, 2026
- No sign-up required for recipients
```

### 4. Share it
Send the link via email, WhatsApp, LinkedIn, or any messaging platform. Recipients open the link and start chatting with your AI agent immediately.

### 5. Check how it's going
```
> "How many people have used my investor link?"
```
The agent calls the analytics endpoint and reports visitor count, conversation count, and top questions asked.
