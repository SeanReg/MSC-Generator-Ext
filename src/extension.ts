// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const spawnSync = require('child_process').spawnSync;

import * as fs from 'fs';
const path = require('path');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let webviewPanel: vscode.WebviewPanel | undefined = undefined
fs
	context.subscriptions.push(
		vscode.commands.registerCommand('msc-gen-editor.start', () => {
			webviewPanel = webviewPanel ?? vscode.window.createWebviewPanel(
				'msc-gen', // Identifies the type of the webview. Used internally
				'MSC-Gen', // Title of the panel displayed to the user
				vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
				{}
			);

			webviewPanel.webview.html = chartToHTML(context) ?? ""

			webviewPanel.reveal()

			webviewPanel.onDidDispose(() => {
				webviewPanel = undefined
			})
		})
	);
}

function chartToHTML(context: vscode.ExtensionContext): string | undefined {
	if (!fs.existsSync(context.globalStoragePath))
		fs.mkdirSync(context.globalStoragePath)


	let inputFile = vscode.window.activeTextEditor?.document?.uri?.fsPath ?? ""
	let fileExists = fs.existsSync(inputFile)

	if (!fileExists) {
		inputFile = path.join(context.globalStoragePath, "chart.signalling")
		let curText = vscode.window.activeTextEditor?.document?.getText()
		fs.writeFileSync(inputFile, curText)

		fileExists = true
	} else {
		//Auto save
		vscode.window.activeTextEditor?.document?.save()
	}

	if (fileExists) {
		const outputFile = path.join(context.globalStoragePath, "tmp.png")

		let res = spawnSync("msc-gen",['-i', inputFile, '-o', outputFile, '-S', 'signalling'])
		 return pngToWebpage(outputFile)
	}

	return undefined
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
		<img src="data:image/png;base64, ${buffer}" />
	</body>
	</html>`;
}

// this method is called when your extension is deactivated
export function deactivate() {}
