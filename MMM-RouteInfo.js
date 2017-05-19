"use strict";
Module.register("test", {});
Module.register("MMM-RouteInfo", {
	routeData: {},
	defaults: {
		animationSpeed: 1000,
		updateInterval: 30000,
		cycleInterval: 5000,
		initialLoadDelay: 0,
		retryDelay: 10000,
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
	requiresVersion: "2.1.0",
	start: function () {
		Log.info("Starting module: " + this.name);
		moment.locale(config.language);
		this.intervalId = null;
		this.loaded = false;
		this.error = false;
		this.errorMessage = "";
		this.displayCycle = 0;
		this.scheduleUpdate(this.config.initialLoadDelay);
		let self = this;
		setInterval(function () {
			self.displayCycle = ++self.displayCycle % 3;
			self.updateDom(self.config.animationSpeed);
		}, self.config.cycleInterval);
	},
	scheduleUpdate: function (delay = this.config.updateInterval) {
		let nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		let self = this;
		setTimeout(function () {
			self.getRouteData(self.config.routeOrigin.address, self.config.routeDestination.address, self.config.googleMapsApiKey);
		}, nextLoad);
	},
	getDom: function () {
		let self = this;
		let wrapper = document.createElement("div");
		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		} else if (this.config.googleMapsApiKey === "") {
			wrapper.innerHTML = "Please set a <i>Google Maps API key</i> (googleMapsApiKey) in the module config: " + this.name + ".";
			wrapper.className = "dimmed light xsmall";
			return wrapper;
		} else if (this.error === true) {
			wrapper.innerHTML = this.translate(this.errorMessage);
			wrapper.className = "dimmed light small";
			return wrapper;
		} else if (this.routeData) {
			let wrapperRouteInfo = document.createElement("div");
			switch (this.displayCycle) {
			case 2:
				{
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
					break;
				}
			case 0:
				{
					let span0 = document.createElement("span");
					span0.classList.add("light", "bright", "medium");
					span0.innerHTML = this.config.routeOrigin.label;
					wrapperRouteInfo.classList.add("regular", "normal", "small");
					wrapperRouteInfo.innerHTML += this.translate("Depart from") + " ";
					wrapperRouteInfo.appendChild(span0);
				}
			case 1:
				{
					break;
				}
			}
			wrapper.appendChild(wrapperRouteInfo);
		}
		return wrapper;
	},
	getStyles: function () {
		return ["MMM-RouteInfo.css", "font-awesome.css"];
	},
	getScripts: function () {
		return ["moment.js"];
	},
	getHeader: function () {
		return this.data.header;
	},
	getTranslations: function () {
		return {
			en: "translations/en.json",
			nl: "translations/nl.json",
		};
	},
	processData: function (payload) {
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
		} else {
			this.error = true;
			this.errorMessage = payload.message;
		}
		this.loaded = true;
	},
	getRouteData: function (origin, destination, apiKey) {
		if (!apiKey || apiKey === "") {
			Log.error("getRouteData: Google Maps API key not set");
			return;
		}
		let payloadRequest = {
			"googleApiKey": apiKey,
			"origin": origin,
			"destination": destination,
		};
		this.sendSocketNotification("GET_ROUTE_INFO", payloadRequest);
		this.scheduleUpdate((this.loaded) ? -1 : this.config.retryDelay);
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "ROUTE_INFO") {
			this.processData(payload);
			this.updateDom(this.config.animationSpeed);
		}
	},
	prettyTimeFormat: function (seconds, showSeconds = false) {
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
