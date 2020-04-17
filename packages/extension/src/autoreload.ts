import * as http from 'http'
import * as vscode from 'vscode'

const server: http.Server = http
  .createServer((_req, res) =>
    res.end(() =>
      server.close(() =>
        vscode.commands.executeCommand('workbench.action.reloadWindow'),
      ),
    ),
  )
  .listen(7575)
