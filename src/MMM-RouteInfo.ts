/* global Module */

/* Magic Mirror
 * Module: MMM-RouteInfo
 *
 * By B. van Wetten
 * MIT Licensed.
 */

/// <reference path="MMM-RouteInfo.d.ts" />
/// <reference path="MagicMirror.d.ts" />
/// <reference path="moment.d.ts" />

"use strict";

Module.register("test", {

});

Module.register("MMM-RouteInfo", {

	routeData: {},

	defaults: {
		animationSpeed: 1000,
		updateInterval: 60000,
		initialLoadDelay: 0,
		retryDelay: 5000,
		timeFormat: config.timeFormat,
		lang: config.language,
		googleMapsApiKey: "",
		routeOrigin: {
			"label": "Thuis",
			"address": "Warffumerweg 39 Onderdendam",
		},
		routeDestination: {
			"label": "Schiphol",
			"address": "P40 Straat Schiphol",
		},
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	/**
	 * This method is called when all modules are loaded an the system is ready to boot up.
	 * Keep in mind that the dom object for the module is not yet created.
	 * The start method is a perfect place to define any additional module properties.
	 *
	 */
	start: function () {
		Log.info("Starting module: " + this.name);

		// Set locale
		moment.locale(config.language);

		this.loaded = false;
		this.error = false;
		this.errorMessage = "";

		// First run
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	/**
	 * Schedule next update. If no delay is given, this.config.updateInterval is used.
	 *
	 * @param {number} delay Milliseconds before next update
	 */
	scheduleUpdate: function (delay: number = this.config.updateInterval) {
		let nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		let self = this;
		setTimeout(function () {
			self.getRouteData(self.config.routeOrigin.address, self.config.routeDestination.address, self.config.googleMapsApiKey);
		}, nextLoad);
	},

	/**
	 * Whenever the MagicMirror needs to update the information on screen (because it starts, or because your module asked a refresh using this.updateDom()),
	 * the system calls the getDom method. This method should therefore return a dom object.
	 *
	 * This is where the module renders it information
	 *
	 * @returns Dom Object
	 */
	getDom: function () {
		let self = this;
		let wrapper = document.createElement("div");

		if (this.config.googleMapsApiKey === "") {
			wrapper.innerHTML = "Please set a <i>Google Maps API key</i> (googleMapsApiKey) in the module config: " + this.name + ".";
			wrapper.className = "dimmed light xsmall";
			return wrapper;
		} else if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		} else if (this.error === true) {
			wrapper.innerHTML = this.translate(this.errorMessage);
			wrapper.className = "dimmed light small";
			return wrapper;
		} else if (this.routeData) {
			let wrapperRouteInfo = document.createElement("div");
			let depTimeSpan = document.createElement("span");
			let arrTimeSpan = document.createElement("span");
			let travelTimeSpan = document.createElement("span");

			depTimeSpan.innerHTML = this.routeData.departureTime.format("LT");
			arrTimeSpan.innerHTML = this.routeData.arrivalTime.format("LT");
			travelTimeSpan.innerHTML = this.routeData.travelTime;
			depTimeSpan.className = "bright";
			arrTimeSpan.className = "bright";
			travelTimeSpan.className = "bright";

			switch (this.routeData.delay) {
				case 0:
					{
						wrapperRouteInfo.innerHTML += this.translate("There is currently no delay enroute") + "<br>";
						break;
					}
				default:
					{
						wrapperRouteInfo.innerHTML += this.translate("Delay enroute is") + ` ${this.routeData.delay} ` + this.translate("minutes") + "<br>";
					}
			}
			wrapperRouteInfo.innerHTML += this.translate("Travel time is") + " ";
			wrapperRouteInfo.appendChild(travelTimeSpan);
			wrapperRouteInfo.innerHTML += " (" + this.routeData.distance + " km)";
			wrapperRouteInfo.innerHTML += "<br>" + this.translate("Depart from") + ` ${this.config.routeOrigin.label} @ `;
			wrapperRouteInfo.appendChild(depTimeSpan);
			wrapperRouteInfo.innerHTML += "<br>" + this.translate("Arrive at") + ` ${this.config.routeDestination.label} @ `;
			wrapperRouteInfo.appendChild(arrTimeSpan);
			wrapperRouteInfo.className = "light small";
			wrapper.appendChild(wrapperRouteInfo);
		}
		return wrapper;
	},

	/**
	 * The getStyles method is called to request any additional stylesheets that need to be loaded.
	 * This method should therefore return an array with strings. If you want to return a full path to a file in the module folder,
	 * use the this.file('filename.css') method. In all cases the loader will only load a file once.
	 * It even checks if the file is available in the default vendor folder.
	 *
	 * @returns
	 */
	getStyles: function () {
		return ["MMM-RouteInfo.css", "font-awesome.css"];
	},

	getScripts: function () {
		return ["moment.js"];
	},

	/**
	 * Whenever the MagicMirror needs to update the information on screen (because it starts, or because your module asked a refresh using this.updateDom()),
	 * the system calls the getHeader method to retrieve the module's header. This method should therefor return a string. If this method is not subclassed,
	 * this function will return the user's configured header. If you want to use the original user's configured header, reference this.data.header.
	 *
	 * NOTE: If the user did not configure a default header, no header will be displayed and thus this method will not be called.
	 *
	 */
	getHeader: function () {
		return this.data.header;
	},

	/**
	 * The getTranslations method is called to request translation files that need to be loaded.
	 * This method should therefore return a dictionary with the files to load, identified by the country's short name.
	 * If the module does not have any module specific translations, the function can just be omitted or return false.
	 *
	 * @returns
	 */
	getTranslations: function () {
		return {
			en: "translations/en.json",
			nl: "translations/nl.json",
		};
	},

	/**
	 *
	 *
	 * @param {any} payload
	 * @returns
	 */
	processData: function (payload: IPayloadResponse) {
		if (!payload) {
			return;
		}

		if (payload.success === true) {
			this.error = false;
			this.routeData.departureTime = moment.utc(payload.data.route.summary.departure).local();
			this.routeData.arrivalTime = moment.utc(payload.data.route.summary.arrival).local();
			this.routeData.travelTime = this.prettyTimeFormat(payload.data.route.summary.duration);
			this.routeData.distance = ~~(payload.data.route.summary.distance / 1000);
			this.routeData.delay = ~~(payload.data.route.summary.delay / 60);
			this.routeData.delayPercentage = (payload.data.route.summary.duration > 0 ? +(payload.data.route.summary.delay / payload.data.route.summary.duration).toFixed(2) * 100 : 0);
			this.routeData.roads = payload.data.route.summary.roadNumbers;

			this.show(this.config.animationSpeed, {
				lockString: this.identifier,
			});
		} else {
			this.error = true;
			this.errorMessage = payload.message;
		}
		this.loaded = true;
	},

	/**
	 * Request route information by sending a request via a socket notification to node_helper.js
	 *
	 * @param {string} origin
	 * @param {string} destination
	 * @param {string} apiKey
	 * @returns
	 */
	getRouteData: function (origin: string, destination: string, apiKey: string) {
		if (!apiKey || apiKey === "") {
			Log.error("getRouteData: Google Maps API key not set");
			return;
		}

		let payloadRequest: IPayloadRequest = {
			"googleApiKey": apiKey,
			"origin": origin,
			"destination": destination,
		};
		this.sendSocketNotification("GET_ROUTE_INFO", payloadRequest);

		// If data was not received (e.g. this.loaded === false) try again
		this.scheduleUpdate((this.loaded) ? -1 : this.config.retryDelay);
	},

	/**
	 * When using a node_helper, the node helper can send your module notifications
	 *
	 * @param {String} notification The notification identifier
	 * @param {any} payload The payload of the notification
	 */
	socketNotificationReceived: function (notification: string, payload: IPayloadResponse) {
		if (notification === "ROUTE_INFO") {
			this.processData(payload);
			this.updateDom(this.config.fadeSpeed);
		}
	},

	/**
	 * Returns a string representing a duration based on a number of seconds that was given as input
	 *
	 * @param {number} seconds
	 * @param {boolean} [showSeconds=false]
	 * @returns {string} String like "1:01" or "4:03:59" or "123:03:59"
	 */
	prettyTimeFormat: function (seconds: number, showSeconds: boolean = false) {
		let hrs = ~~(seconds / 3600);
		let mins = ~~((seconds % 3600) / 60);
		let secs = seconds % 60;

		let duration = "";

		if (hrs > 0) {
			duration += "" + hrs + ":" + (mins < 10 ? "0" : "");
		}

		duration += "" + mins;
		if (showSeconds) {
			duration += ":" + (secs < 10 ? "0" : "") + secs;
		}
		return duration;
	}
});