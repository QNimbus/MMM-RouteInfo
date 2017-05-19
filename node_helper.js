"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nodeHelper = require("node_helper");
const requestpromise = require("request-promise");
const maps = require("@google/maps");
const helpers = require("./helpers");
let ANWB = {
	apiKeyPromise: null,
	getAPIKey: function () {
		if (!this.apiKeyPromise) {
			let url = "https://www.anwb.nl/routeplanner";
			let apiKey = "";
			let apiKeyRegEx = new RegExp("<a href=\"(?:https:\/\/api\.anwb\.nl\/v1\/auth\/token\?.*?client_id=([^&\"]+).*?\">)", "g");
			let queryString = url;
			let pending = false;
			this.apiKeyPromise = requestpromise(queryString)
				.then((htmlString) => {
					console.log("Fetching ANWB API key");
					let match = apiKeyRegEx.exec(htmlString);
					if (match !== null) {
						let key = match[1];
						return Promise.resolve(key);
					} else {
						return Promise.reject("Unable to parse API key");
					}
				})
				.catch((error) => {
					console.log(`Unable to fetch API key (${error})`);
				});
		}
		return this.apiKeyPromise;
	},
};
let determineCountry = function (addressComponents) {
	let result = undefined;
	addressComponents.forEach((entry) => {
		if (entry.types.indexOf("country") > -1) {
			result = entry.short_name;
		}
	});
	return result;
};
class Address {
	constructor(address) {
		this._addressPromise = (resolve, reject) => {
			let _getGoogleMapsResults = (response) => {
				if (response.json.status === "OK") {
					console.log("Fetching Google Maps location data for - " + response.json.results[0].formatted_address);
					this.addressComponents = response.json.results[0].address_components;
					this.formattedAddress = response.json.results[0].formatted_address;
					this.latlong = `${response.json.results[0].geometry.location.lat},${response.json.results[0].geometry.location.lng}`;
					if (determineCountry(this.addressComponents) === "NL") {
						resolve(this);
					} else {
						reject(new Error("Only locations in the Netherlands are allowed"));
					}
				}
			};
			let googleMapsClient = maps.createClient({ key: googleApiKey, Promise: Promise });
			googleMapsClient.geocode({ address: this.originalAddress })
				.asPromise()
				.then(_getGoogleMapsResults.bind(this));
		};
		this.originalAddress = address;
	}
	getAddressData() {
		if (!this.addressPromise) {
			this.addressPromise = new Promise(this._addressPromise.bind(this));
		}
		return this.addressPromise;
	}
}
class Route {
	constructor(origin, destination) {
		this._routePromise = (resolve, reject) => {
			Promise.all([this.origin.getAddressData(), this.destination.getAddressData()])
				.then((result) => {
					this.origin = result[0];
					this.destination = result[1];
					resolve(this);
				});
		};
		this.origin = origin;
		this.destination = destination;
	}
	_getRouteAddressData() {
		if (!this.routePromise) {
			this.routePromise = new Promise(this._routePromise.bind(this));
		}
		return this.routePromise;
	}
	getRouteData() {
		return Promise.all([this._getRouteAddressData(), ANWB.getAPIKey()])
			.then((value) => {
				let path = "/v1/routing";
				let url = "https://api.anwb.nl";
				let parameters = {
					"apikey": `${value[1]}`,
					"locations": `${value[0].origin.latlong}:${value[0].destination.latlong}`,
					"transportMode": "car",
					"polyLine": "false",
					"instructions": "false",
					"maxAlternatives": "0",
					"routeType": "fastest",
					"traffic": "true",
				};
				let queryString = url + path + helpers.formatParams(parameters);
				return requestpromise(queryString).then((result) => {
					console.log("Fetching route information for " + value[0].origin.formattedAddress + " <--> " + value[0].destination.formattedAddress);
					result = JSON.parse(result);
					return Promise.resolve({
						route: result.routes[0],
						origin: value[0].origin,
						destination: value[0].destination,
					});
				});
			})
			.catch((error) => {
				throw new Error("No valid result from ANWB API :" + error);
			});
	}
}
class Routes {
	constructor() {
		if (!Routes._instance) {
			Routes.list = {};
			Routes._instance = this;
		}
		return Routes._instance;
	}
	static getRouteInformation(origin, destination) {
		if (!Routes._instance) {
			Routes._instance = new Routes();
		}
		let routeHash = helpers.getHash(`${origin}${destination}`);
		let route;
		if (Routes.list && Routes.list.hasOwnProperty(routeHash) && Routes.list[routeHash] instanceof Route) {
			route = Routes.list[routeHash];
		} else {
			route = new Route(new Address(origin), new Address(destination));
			Routes.list[routeHash] = route;
		}
		return route.getRouteData();
	}
}
let googleApiKey = "";
module.exports = nodeHelper.create({
	start: function () {},
	getData: function (payload) {
		let self = this;
		googleApiKey = payload.googleApiKey;
		Routes.getRouteInformation(payload.origin, payload.destination)
			.then((result) => {
				let routeInfo = { data: result, success: true };
				self.sendSocketNotification("ROUTE_INFO", routeInfo);
			})
			.catch((error) => {
				let routeInfo = { message: error.message, success: false };
				self.sendSocketNotification("ROUTE_INFO", routeInfo);
			});
	},
	socketNotificationReceived: function (notification, payload) {
		if (notification === "GET_ROUTE_INFO") {
			this.getData(payload);
		}
	},
});
