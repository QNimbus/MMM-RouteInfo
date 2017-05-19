/* Magic Mirror
 * Node Helper: MMM-RouteInfo
 *
 * By B. van Wetten
 * MIT Licensed.
 */

/// <reference path="MMM-RouteInfo.d.ts" />

const nodeHelper = require("node_helper");
const requestpromise = require("request-promise");
const maps = require("@google/maps");

import * as helpers from "./helpers";

let ANWB = {
	apiKeyPromise: null as Promise<string>,

	getAPIKey: function (): Promise<string> {
		// If apiKeyPromise is not defined yet
		if (!this.apiKeyPromise) {
			let url = "https://www.anwb.nl/routeplanner";
			let apiKey = "";
			let apiKeyRegEx = new RegExp("<a href=\"(?:https:\/\/api\.anwb\.nl\/v1\/auth\/token\?.*?client_id=([^&\"]+).*?\">)", "g");
			let queryString = url;
			let pending = false;

			this.apiKeyPromise = requestpromise(queryString)
				.then((htmlString: string) => {
					console.log("Fetching ANWB API key");
					let match: string[] = apiKeyRegEx.exec(htmlString);
					if (match !== null) {
						let key: string = match[1];
						// Return new resolved promise
						return Promise.resolve(key) as Promise<string>;
					} else {
						// Return new rejected promise
						return Promise.reject("Unable to parse API key") as Promise<string>;
					}
				})
				.catch((error: Error) => {
					console.log(`Unable to fetch API key (${error})`);
				}) as Promise<string>;
		}
		return this.apiKeyPromise;
	},
};

/**
 * Filters a result from Google Maps API to determine the locality/country of a response object
 *
 * @param {AddressComponents} addressComponents
 * @returns {(string | undefined)}
 */
let determineCountry = function (addressComponents: AddressComponents): string | undefined {
	let result = undefined;
	addressComponents.forEach((entry) => {
		if (entry.types.indexOf("country") > -1) {
			result = entry.short_name;
		}
	});
	return result;
};

/**
 *
 *
 * @class Address
 * @implements {IAddress}
 */
class Address implements IAddress {
	public addressPromise?: AddressPromise;
	public originalAddress: string;
	public formattedAddress?: string;
	public addressComponents?: Array<{ [id: string]: string[] | string }>;
	public latlong?: string;

	/**
	 * Creates an instance of Address.
	 * @param {string} address
	 *
	 * @memberof Address
	 */
	constructor(address: string) {
		this.originalAddress = address;
	}

	/**
	 *
	 *
	 * @private
	 *
	 * @memberof Address
	 */
	private _addressPromise = (resolve: (response: any) => AddressPromise, reject: (error: Error) => AddressPromise) => {
		let _getGoogleMapsResults = (response: any) => {
			if (response.json.status === "OK") {
				console.log("Fetching Google Maps location data for - " + response.json.results[0].formatted_address);
				this.addressComponents = response.json.results[0].address_components;
				this.formattedAddress = response.json.results[0].formatted_address;
				this.latlong = `${response.json.results[0].geometry.location.lat},${response.json.results[0].geometry.location.lng}`;

				// Make sure the address lies in our country; otherwise route planner will not work
				if (determineCountry(this.addressComponents) === "NL") {
					resolve(this);
				} else {
					reject(new Error("Only locations in the Netherlands are allowed"));
				}
			}
		};

		let googleMapsClient: any = maps.createClient({ key: googleApiKey, Promise: Promise }) as AddressPromise;

		googleMapsClient.geocode({ address: this.originalAddress })
			.asPromise()
			.then(_getGoogleMapsResults.bind(this));
	}

	/**
	 *
	 *
	 * @returns {AddressPromise}
	 *
	 * @memberof Address
	 */
	public getAddressData(): AddressPromise {
		if (!this.addressPromise) {
			this.addressPromise = new Promise(this._addressPromise.bind(this)) as AddressPromise;
		}
		return this.addressPromise;
	}
}

/**
 *
 *
 * @class Route
 * @implements {IRoute}
 */
class Route implements IRoute {
	routePromise?: RoutePromise;
	origin: Address;
	destination: Address;

	constructor(origin: Address, destination: Address) {
		this.origin = origin;
		this.destination = destination;
	}

	/**
	 *
	 *
	 * @private
	 *
	 * @memberof Route
	 */
	private _routePromise = (resolve: (response: any) => RoutePromise, reject: (error: Error) => RoutePromise) => {
		Promise.all([this.origin.getAddressData(), this.destination.getAddressData()])
			.then((result: [Address, Address]) => {
				this.origin = result[0];
				this.destination = result[1];
				resolve(this);
			});
	}

	/**
	 *
	 *
	 * @private
	 * @returns {RoutePromise}
	 *
	 * @memberof Route
	 */
	private _getRouteAddressData(): RoutePromise {
		if (!this.routePromise) {
			this.routePromise = new Promise(this._routePromise.bind(this)) as RoutePromise;
		}
		return this.routePromise;
	}

	/**
	 *
	 *
	 * @returns {RouteInformationPromise}
	 *
	 * @memberof Route
	 */
	public getRouteData(): RouteInformationPromise {
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

				// Construct a HTTP GET url using a helper function to create a parameter string
				let queryString = url + path + helpers.formatParams(parameters);
				return requestpromise(queryString).then((result: any) => {
					console.log("Fetching route information for " + value[0].origin.formattedAddress + " <--> " + value[0].destination.formattedAddress);
					result = JSON.parse(result);
					return Promise.resolve({
						route: result.routes[0],
						origin: value[0].origin,
						destination: value[0].destination,
					} as IRouteInformation);
				});
			})
			.catch((error: Error) => {
				throw new Error("No valid result from ANWB API :" + error);
			});
	}
}

/**
 * Singleton class which holds a list of routes currently in use. In effect caching the latlong's of both the origin and destination
 *
 * @class Routes
 */
class Routes {
	private static _instance?: Routes;
	private static list: { [id: string]: Route; };

	// Singleton
	constructor() {
		if (!Routes._instance) {
			Routes.list = {};
			Routes._instance = this;
		}

		return Routes._instance;
	}

	/**
	 * A wrapper around the route.getRouteData function
	 *
	 * @static
	 * @param {string} origin - Address string of the origin of the route
	 * @param {string} destination - Address string of the destination of the route
	 * @returns {RouteInformationPromise}
	 *
	 * @memberof Routes
	 */
	public static getRouteInformation(origin: string, destination: string): RouteInformationPromise {
		// Initialize Singleton
		if (!Routes._instance) {
			Routes._instance = new Routes();
		}

		// Generate hash to cache unique route
		let routeHash: string = helpers.getHash(`${origin}${destination}`);
		let route: Route;

		// If route is found in list, fetch it
		if (Routes.list && Routes.list.hasOwnProperty(routeHash) && Routes.list[routeHash] instanceof Route) {
			route = Routes.list[routeHash];
		} else {
			// Otherwise, create a new route and store it in the list using the calculated hash string
			route = new Route(new Address(origin), new Address(destination));
			// Store the route in the list
			Routes.list[routeHash] = route;
		}
		return route.getRouteData();
	}
}

// Variable declarations
let googleApiKey = "";

module.exports = nodeHelper.create({

	/**
	 *
	 *
	 */
	start: function () {
	},

	/**
	 * Helper function to get route data using a promise
	 *
	 * @param {IPayloadRequest} payload
	 */
	getData: function (payload: IPayloadRequest) {
		let self = this;

		googleApiKey = payload.googleApiKey;
		Routes.getRouteInformation(payload.origin, payload.destination)
			.then((result: IRouteInformation) => {
				let routeInfo: IPayloadResponse = { data: result, success: true };
				self.sendSocketNotification("ROUTE_INFO", routeInfo);
			})
			.catch((error: Error) => {
				let routeInfo: IPayloadResponse = { message: error.message, success: false };
				self.sendSocketNotification("ROUTE_INFO", routeInfo);
			});
	},

	/**
	 * This method is called when a socket notification arrives.
	 *
	 * @param {string} notification - The identifier of the notification.
	 * @param {IPayloadRequest} payload - The payload of the notification.
	 */
	socketNotificationReceived: function (notification: string, payload: IPayloadRequest) {
		if (notification === "GET_ROUTE_INFO") {
			this.getData(payload);
		}
	},
});
