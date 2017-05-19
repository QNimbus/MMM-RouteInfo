// Type definitions for MagicMirror v2.1.0
// Project: https://github.com/qnimbus/magicmirror
// Definitions by: B. van Wetten <https://github.com/qnimbus>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference path="electron.d.ts" />

declare type Payload = any;

declare interface IObjectProperties {
	[key: string]: Object;
}

declare interface IModuleDefinition extends IObjectProperties {
	defaults?: {};
	requiresVersion?: string;

	init?(): void;
	loaded?(callback: () => void): void;
	start?(): void;
	getDom?(): HTMLDivElement;
	getStyles?(): Array<string>;
	getScripts?(): Array<string>;
	getHeader?(): string;

	notificationReceived?(notification: string, Payload: any, sender?: any): void;
	socketNotificationReceived?(notification: string, payload: Payload): void;
	sendNotification?(notification: string, payload: Payload): void;
}

declare interface ILogFunction {
	(text: string): undefined;
}

declare interface IModule extends IObjectProperties {
	name: string;
	module: string;
	position?: string;
	classes?: string[];
	header?: string;
	disabled?: boolean;
	config?: object;
}

declare var config: {
	port: number;
	address: string;
	ipWhitelist: string[];
	zoom: number;
	language: string;
	timeFormat: string;
	units: string;
	modules: Array<IModule>;
	electronOptions: Electron.BrowserWindowConstructorOptions;

	updateInterval: number;
}

declare var Module: {
	register(moduleName: string, moduleDefinition: IModuleDefinition): undefined;

	init(): void | undefined;
	loaded(callback: () => void): void | undefined;
	start(): void | undefined;
	getDom(): HTMLDivElement;
	getStyles(): Array<string>;
	getScripts(): Array<string>;
	getHeader(): string;
	show(speed: number, callback: () => void, options?: Object): void;
	hide(speed: number, callback: () => void, options?: Object): void;
}

declare var Log: {
	info: ILogFunction;
	log: ILogFunction;
	error: ILogFunction;
	warn: ILogFunction;
	group: ILogFunction;
	groupCollapsed: ILogFunction;
	groupEnd: ILogFunction;
	time: ILogFunction;
	timeEnd: ILogFunction;
	timeStamp: ILogFunction;
};