"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
exports.formatParams = function (params) {
	return "?" + Object
		.keys(params)
		.map(function (key) {
			return key + "=" + params[key];
		})
		.join("&");
};
exports.getHash = function (input) {
	let hash = crypto.createHash("md5");
	return hash.update(input, "utf8").digest("hex");
};
