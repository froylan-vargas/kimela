# API Debugging

## How it works

The dev container runs NestJS with `nest start --debug 0.0.0.0 --watch`, which:
- Exposes the Node.js debugger on port `9229` (accessible from the host)
- Watches for source changes and recompiles automatically
- Source files at `apps/api/src/` are mounted into the container, so edits are picked up without rebuilding the image

## Start the stack

```bash
docker compose up --build
```

## Attach the debugger (VS Code)

1. Open the **Run & Debug** panel (`Cmd+Shift+D`)
2. Select **"Attach to API (Docker)"** from the dropdown
3. Press **F5**

Set breakpoints anywhere in `apps/api/src/` — execution will pause there on the next hit.

## Reattach after a file change

NestJS restarts the process on every file save. VS Code will reconnect automatically because `restart: true` is set in `.vscode/launch.json`.

If it does not reconnect, press F5 again after the container finishes recompiling (watch for `Nest application successfully started` in the logs).

## Relevant files

| File | Purpose |
|---|---|
| `apps/api/Dockerfile.dev` | Dev image — runs `nest start --debug` |
| `docker-compose.override.yml` | Exposes port `9229` and mounts `apps/api/src` |
| `.vscode/launch.json` | "Attach to API (Docker)" configuration |
