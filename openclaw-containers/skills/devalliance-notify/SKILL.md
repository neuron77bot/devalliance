# DevAlliance Task Notification

This skill allows you to notify the DevAlliance backend about task execution status.

## When to use

Use this skill when executing tasks assigned by DevAlliance Mission Control:

- **At START**: Notify when you begin processing a task
- **On SUCCESS**: Notify when the task completes successfully
- **On ERROR**: Notify if the task fails

## Tool

### notify-task.sh

Sends HTTP POST to the backend with task status.

**Syntax:**

```bash
./notify-task.sh <taskId> <status> [result] [error]
```

**Parameters:**

• `taskId` (required): Task identifier from the task prompt
• `status` (required): One of: `started`, `completed`, `failed`
• `result` (optional): Success message or description of what was done
• `error` (optional): Error message (only for failed status)

**Examples:**

When you receive a task from DevAlliance:

1. Parse the Task ID from the prompt (line: "Task ID: ...")
2. Notify START:
   ```bash
   ./skills/devalliance-notify/notify-task.sh <taskId> started
   ```
3. Execute the task using appropriate tools
4. Notify result:
   • Success:
   ```bash
   ./skills/devalliance-notify/notify-task.sh <taskId> completed "<description>"
   ```
   • Failure:
   ```bash
   ./skills/devalliance-notify/notify-task.sh <taskId> failed "" "<error>"
   ```

## Configuration

The script uses these environment variables:

• `DEVALLIANCE_BACKEND_URL` (default: http://localhost:3101)
• `OPENCLAW_AGENT_ID` (auto-set by OpenClaw)
