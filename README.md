# MagicMirrorModule-RouteInfo

This is a module for the [MagicMirror²](https://github.com/MichMich/MagicMirror/). This module fetches information on a route given an origin and a destination address. It will show you the distance, estimated time of arrival (and delay) based on current traffic.

Note: Currently this module only supports routes within the Netherlands. It uses the ANWB REST API to fetch route information.

## Installation

1. Navigate into your MagicMirror's `modules` folder and run:
```
git clone https://github.com/QNimbus/MMM-RouteInfo.git
```
1. Install the dependencies: 
```
cd MMM-RouteInfo && npm install --only=production
```

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:
```js
var config = {
    modules: [
        {
            module: 'MMM-RouteInfo',
            config: {
                // See below for configurable options
                googleMapsApiKey: "[YOUR-API-KEY-HERE]",
                routeOrigin: {
                    "label": "Thuis",
                    "address": "Warffumerweg 39 Onderdendam",
                },
                routeDestination: {
                    "label": "Schiphol",
                    "address": "P40 Straat Schiphol",
                },
                timeFormat: config.timeFormat,
                lang: config.language,                               
                animationSpeed: 1000,
                updateInterval: 60000,
                initialLoadDelay: 0,
                retryDelay: 5000,                
            }
        }
    ]
}
```

## Configuration options

| Option           | Description
|----------------- |-----------
| `googleMapsApiKey`| *Required* Your Google Maps API key<br>**Type:** `string`<br>You can get your API key here: [Google developers console](https://console.developers.google.com/)
| `routeOrigin`    | *Required* Start of the route address<br>**Type:** `string`<br>
| `routeDestination`| *Required* End of the route address<br>**Type:** `string`<br>
| `timeFormat`     | *Optional* Timeformat of times used in the module<br>**Type:** `int` (e.g. 12 or 24)<br>Default `config.timeFormat`
| `lang`           | *Optional* Display language for the module<br>**Type:** `string` (e.g. 'en', 'nl' or 'fr')<br>Default `config.language`
| `animationSpeed` | *Optional* Speed of the animations<br>**Type:** `int`(milliseconds)<br>Default 1000 milliseconds (1 second)
| `updateInterval` | *Optional* Interval at which the module fetches new data<br>**Type:** `int`(milliseconds)<br>Default 60000 milliseconds (60 seconds)
| `initialLoadDelay` | *Optional* Initial delay when module is first loaded<br>**Type:** `int`(milliseconds)<br>Default 0 milliseconds (0 seconds)
| `retryDelay`     | *Optional* If no data is received, retry again after delay<br>**Type:** `int`(milliseconds)<br>Default 5000 milliseconds (5 seconds)

## Screenshots

![alt text][ss_01]

[ss_01]: images/module_ss_01.png "Example of RouteInfo module at work"