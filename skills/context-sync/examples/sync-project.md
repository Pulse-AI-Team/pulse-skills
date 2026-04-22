# Example: Sync a Project Directory

## Scenario
You're working on a project and want your shared agent to know about the project docs.

## Conversation

```
User: "Sync my docs folder to Aicoo"

Agent: Let me check your current context status first.
[Calls GET /os/status]

You currently have 12 files synced. Let me scan ./docs for files to upload.
[Reads directory, finds 8 markdown files]

Found 8 files in ./docs:
- README.md (2.1 KB)
- architecture.md (4.5 KB)
- api-reference.md (8.2 KB)
- deployment.md (1.8 KB)
- contributing.md (1.2 KB)
- changelog.md (3.4 KB)
- security.md (2.8 KB)
- roadmap.md (1.6 KB)

Uploading to Aicoo folder "docs"...
[Calls POST /accumulate with all 8 files]

Done! 8 files synced to your "docs" folder on Aicoo.
You now have 20 total context items.

Want to create a share link so others can talk to your agent about this project?
```

## What the agent did
1. Checked current context status
2. Used the Read tool to scan the local directory
3. Read each file's content
4. Uploaded all files in a single API call
5. Reported results and suggested next step
