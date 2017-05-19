// Type definitions for MagicMirror v2.1.0
// Project: https://github.com/qnimbus/magicmirror
// Definitions by: B. van Wetten <https://github.com/qnimbus>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare type AddressPromise = Promise<IAddress>;
declare type RoutePromise = Promise<IRoute>;
declare type RouteInformationPromise = Promise<IRouteInformation>;

declare type AddressComponents = Array<{ [id: string]: string[] | string }>;

declare var routeData: {
	delayPercentage: number;
}

interface IPayloadResponse {
	success: boolean;
	message?: string;
	data?: IRouteInformation;
}

interface IPayloadRequest {
	googleApiKey: string,
	origin: string,
	destination: string,
}

interface IAddress {
	originalAddress: string;
	formattedAddress?: string;
	addressComponents?: AddressComponents;
	latlong?: string;
}

interface IRoute {
	routePromise?: RoutePromise;
	origin: IAddress;
	destination: IAddress;
}

interface IRouteInformation {
	route: {
		id: string;
		legs: object[];
		summary: {
			departure: string;
			arrival: string;
			duration: number;
			distance: number;
			delay: number;
			roadNumbers: string[];
		};
	};
	origin: IAddress;
	destination: IAddress;
}

interface IRoutes {
	_instance?: IRoutes;
	list?: { [id: string]: IRoute; };
}