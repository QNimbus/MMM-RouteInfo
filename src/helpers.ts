/* global Module */

/* Magic Mirror
 * Module: MMM-RouteInfo
 *
 * By B. van Wetten
 * MIT Licensed.
 */

import * as crypto from "crypto";

export let HTTPCODES: {
	SUCCESS: 200,
	UNAUTHORIZED: 401,
	NOTFOUND: 404,
	ERROR: 500,
};

/**
 *
 *
 * @param {{ [key: string]: string }} params Helper function to construct a GET query string
 * @returns {string}
 */
export let formatParams = function (params: { [key: string]: string }): string {
	return "?" + Object
		.keys(params)
		.map(function (key) {
			return key + "=" + params[key]
		})
		.join("&");
};

/**
 * Calculates MD5 hash for a given string
 *
 * @param {string} input String to be hashed
 * @returns {string} Hashed string
 */
export let getHash = function (input: string): string {
	let hash = crypto.createHash("md5");
	return hash.update(input, "utf8").digest("hex") as string;
};

