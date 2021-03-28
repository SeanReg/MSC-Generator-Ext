// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const spawnSync = require('child_process').spawnSync;

import * as fs from 'fs';
const path = require('path');

let webviewPanel: vscode.WebviewPanel | undefined = undefined

enum BrowserMessage {
	SAVE_FILE
}

class MscGen {
	private get path(): string | undefined {
		const config = vscode.workspace.getConfiguration('msc-gen-editor');
		return config.get<string>('path')
	}

	fileToImage(input: string, output: string): boolean {
		const exe = path.join((this.path ?? ""),  "msc-gen")
		
		let res = spawnSync(exe, ['-i', input, '-o', output, '-S', 'signalling'])

		return res == 0 ? true : false
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	

	vscode.workspace.onDidSaveTextDocument(event => {
		if (event.fileName.endsWith(".signalling") || event.fileName.endsWith(".signaling")) {
			displayMSCFromFile(context, event.fileName)
		}
	})

	context.subscriptions.push(
		vscode.commands.registerCommand('msc-gen-editor.start', () => generateMsc(context))
	);
}

function generateMsc(context: vscode.ExtensionContext) {
	checkGlobalStorage(context)

	let inputFile = vscode.window.activeTextEditor?.document?.uri?.fsPath ?? ""
	let fileExists = fs.existsSync(inputFile)

	if (!fileExists) {
		const tmpFile = "chart.signalling"
		inputFile = path.join(context.globalStoragePath, tmpFile)
		let curText = vscode.window.activeTextEditor?.document?.getText()
		fs.writeFileSync(inputFile, curText)

		fileExists = true
	} else {
		//Auto save
		vscode.window.activeTextEditor?.document?.save()
	}

	if (fileExists) {
		displayMSCFromFile(context, inputFile)
	}
}

function displayMSCFromFile(context: vscode.ExtensionContext, filePath: string) {
	webviewPanel = webviewPanel ?? vscode.window.createWebviewPanel(
		'msc-gen', // Identifies the type of the webview. Used internally
		'MSC-Gen', // Title of the panel displayed to the user
		vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
		{enableScripts: true}
	);

	webviewPanel.webview.html = chartToHTML(context, filePath) ?? ""
	webviewPanel.webview.onDidReceiveMessage(message => {
		switch (message.command as BrowserMessage) {
			case BrowserMessage.SAVE_FILE:
				savePNGFile(Buffer.from(message.file, 'base64'))
				break;
		}
	})
	webviewPanel.reveal()

	webviewPanel.onDidDispose(() => {
		webviewPanel = undefined
	})
}

function savePNGFile(png: Buffer) {
	vscode.window.showSaveDialog({filters: {'PNG Image': ['png']}}).then(filePath => {
		if (filePath != null) {
			fs.writeFileSync(filePath.fsPath, png)
		}
	})
}

function checkGlobalStorage(context: vscode.ExtensionContext) {
	if (!fs.existsSync(context.globalStoragePath))
		fs.mkdirSync(context.globalStoragePath)
}

function chartToHTML(context: vscode.ExtensionContext, inputFile: string): string | undefined {
	checkGlobalStorage(context)

	const outputFile = path.join(context.globalStoragePath, "tmp.png")
	fs.unlinkSync(outputFile)

	new MscGen().fileToImage(inputFile, outputFile);
	return pngToWebpage(outputFile)

}

function pngToWebpage(png: string) {
	let img = fs.readFileSync(png);
	let buffer = Buffer.from(img).toString('base64');

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Msc</title>
	</head>
	<body>
		<button style="font-weight:bold;" onclick="saveClick()">Save As...</button>
		<img style="margin-top:20px; display:block;" src="data:image/png;base64, ${buffer}" />

		<script>
			let vscode
			(function() {
				vscode = acquireVsCodeApi();
			}())
			function saveClick() {
				vscode.postMessage({
					command: ${BrowserMessage.SAVE_FILE},
					file: "${buffer}"
				})
			}
	    </script>
		
	</body>
	</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() {}
