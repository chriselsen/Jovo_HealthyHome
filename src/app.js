'use strict';

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { FileDb } = require('jovo-db-filedb');

const app = new App();
const request = require('request');
const configurationFile = 'config.json';
const fs = require('fs');
const config = JSON.parse(
    fs.readFileSync(configurationFile)
);

app.use(
    new Alexa(),
    new GoogleAssistant(),
    new JovoDebugger(),
    new FileDb()
);

// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------

app.setHandler({
    LAUNCH() {
        return this.toIntent('HealthyHomeIntent');
    },

    HealthyHomeIntent() {
        this.ask('You can ask me for the current temperature, relative humidity, barometric pressure, or carbon dioxide concentration. What value would you like to know?');
    },

    async TemperatureIntent() {
		var response;
		if (this.$inputs.Unit.value == "Fahrenheit"){
			response = await netatmoHealthyHomeValue("TempF");
		} else {
			response = await netatmoHealthyHomeValue("TempC");
		}
		console.log("Response: " + response);
		this.tell(response);
    },

	async HumidityIntent() {
		var response;
		response = await netatmoHealthyHomeValue("Humidity");
		console.log("Response: " + response);
		this.tell(response);
    },

	async PressureIntent() {
		var response;
		response = await netatmoHealthyHomeValue("Pressure");
		console.log("Response: " + response);
		this.tell(response);
    },

	async CO2Intent() {
		var response;
		response = await netatmoHealthyHomeValue("CO2");
		console.log("Response: " + response);
		this.tell(response);
    },
});

async function netatmoHealthyHomeValue(value) {
	return new Promise((resolve, reject)  => { 
		netatmoGetAuthKey(function (AuthKey) {
			netatmoGetValue(AuthKey, function (Data) {
				var jsonContent = JSON.parse(Data);
				console.log(jsonContent.dashboard_data.Temperature);
				var response;
				switch(value){
					case "TempC":
						response = "The current temperature is " + jsonContent.dashboard_data.Temperature + " degrees Celsius.";
						break;
					case "TempF":
						response = "The current temperature is " + ( ( jsonContent.dashboard_data.Temperature * 1.8 ) + 32 ) + " degrees Fahrenheit.";
						break;
					case "Humidity":
						response = "The current relative humidity is " + jsonContent.dashboard_data.Humidity + " percent.";
						break;
					case "Pressure":
						response = "The current pressure is " + jsonContent.dashboard_data.Pressure + " millibar.";
						break;
					case "CO2":
						response = "The current CO2 concentration is " + jsonContent.dashboard_data.CO2 + " parts per million.";
						break;
					default:
						response = "Sorry, this value is unknown.";
				}
				console.log("Response: " + response);
				resolve(response);
			});
		});
	});	
}

function netatmoGetAuthKey(callback) {
	var https = require('https');
	var querystring = require('querystring');

	var post_data = querystring.stringify({
	    'grant_type' : 'password',
	    'client_id' : config.NetatmoClientID,
	    'client_secret' : config.NetatmoClientSecret,
	    'username' : config.NetatmoUsername,
	    'password' : config.NetatmoPassword,
	    'scope' : 'read_homecoach'
	});

    var post_options = {
        hostname: 'api.netatmo.com',
        port: '443',
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    var post_req = https.request(post_options, function(res) {
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            var jsonContent = JSON.parse(chunk);
            console.log('Access Token: ' + jsonContent.access_token);
            callback(jsonContent.access_token);
        });
    });

    post_req.write(post_data);
    post_req.end();

    post_req.on('error', function (e) {
        console.log("Communications error: " + e.message);
    });
}

function netatmoGetValue(authKey, callback) {
    var https = require('https');

    var endpoint = 'https://api.netatmo.com/api/gethomecoachsdata';
    var deviceID = config.NetatmoDeviceID;
  	var queryString = '?access_token=' + authKey + '&device_id=' + deviceID;

  	var post_req = https.get(endpoint + queryString, function (res) {
         res.on('data', function (data) {
   		    var jsonContent = JSON.parse(data);
   		    console.log('Data: ' + JSON.stringify(jsonContent.body.devices[0]));
   		    callback(JSON.stringify(jsonContent.body.devices[0]));
        });
 	});

  	post_req.on('error', function (e) {
        console.log("Communications error: " + e.message);
    });
}

module.exports.app = app;
