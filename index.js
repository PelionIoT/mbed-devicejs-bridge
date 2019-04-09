/*
 * Copyright (c) 2018, Arm Limited and affiliates.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 * @module mbed-devicejs-bridge
 * The bridge commands are accessible by selecting it, as such:
 *
 * dev$.selectByID("MbedDeviceJSBridge")
 *
 * The bridge communicates directly with the Mbed Edge server, which is 
 * normally running on a localport on the same machine as this software.
 *
 * For the moment, the Bridge will also communicate with the Mbed Cloud
 * using the 'mbed-cloud-sdk' This means the software needs to be configured to 
 * with an mbed API key.
 * 
*/
// node.js built-ins
const util = require('util');
const child_process = require('child_process');
// 3rd party
const handlebars = require('handlebars');
// WigWag libs
const devjsUtils = require('devjs-utils').instance(dev$);
// ARM provided
//const Edge = require('../mbed-cloud-edge-js');
const Edge = require('../mbed-edge-websocket');
// App internal
const defaults = require('./defaults.js');
const mappingrules = require('./default-mapping.js');
const appConsts = require('./consts.js');
const appEvents = require('./mbed-bridge-events.js')
const appLog = require('./bridge-log.js')
const wget = require('node-wget')
const fs = require('fs');

var request = require('request')
var url = require('url')

const events = appEvents.events()

var Config = null;
var edge = null;

var bridgeModule = require('./bridge.js');
// Will get instantiated below, after config is read
var Bridge = null;

var ERROR = function(){
    arguments[0] = "mbed-devicejs-brige: " + arguments[0];
    log.error.apply(log,arguments);
}

var DBG_ON = function(){
    arguments[0] = "mbed-devicejs-brige: " + arguments[0];
    log.debug.apply(log,arguments);
}

var DBG_OFF = function(){}

var DBG = DBG_OFF;

/**
 * process the defaults and the user config. Merge 
 * together, and create maps for everything, so lookups
 * are fast
 * 
 * @param  {[type]} userconfig [description]
 * @return {[type]}            [description]
 */
var processConfig = function(userconfig) {
    return new Promise(function(resolve, reject) {
        Config = defaults;
        Config.IGNORE_BY_ID = {};
        Config.WHITELIST_BY_ID = {};
        var p = []

        if(!userconfig || (userconfig && userconfig.useDefaults !== false)) {

            // setup defaults:

            if(Config.ignoreDevicesById && Config.ignoreDevicesById.length) {
                for(var n=0;n<Config.ignoreDevicesById.length;n++) {
                    Config.IGNORE_BY_ID[Config.ignoreDevicesById[n]] = true;
                }
            }
            if(Config.whitelistById && Config.whitelistById.length) {
                for(var n=0;n<Config.whitelistById.length;n++) {
                    Config.WHITELIST_BY_ID[Config.whitelistById[n]] = true;
                }
            }

        } else {
            log.warn("mbed-devicejs-brige: Note - not using defaults.");
        }

        if(userconfig && typeof userconfig == 'object') {
            // merge in user configs:
            if(userconfig.ignoreDevicesById && userconfig.ignoreDevicesById.length) {
                for(var n=0;n<userconfig.ignoreDevicesById.length;n++) {
                    Config.IGNORE_BY_ID[userconfig.ignoreDevicesById[n]] = true;
                }
            }
            if(userconfig.whitelistById && userconfig.whitelistById.length) {
                for(var n=0;n<userconfig.whitelistById.length;n++) {
                    Config.WHITELIST_BY_ID[userconfig.whitelistById[n]] = true;
                }
            }

            if(userconfig.selectionForDiscovery) {
                Config.selectionForDiscovery = userconfig.selectionForDiscovery;
            }

            if(userconfig.mbedEndpointDevicePrefix) {
                Config.mbedEndpointDeviceTemplate = userconfig.mbedEndpointDeviceTemplate;
            }

            if(userconfig.whiteListOnly) {
                Config.whiteListOnly = true;
            }

            if(userconfig.mappingRules) {
                Config.mappingRules = userconfig.mappingRules;
            }

            if(userconfig.debug !== undefined) {
                Config.debug = userconfig.debug;
            }
/*
            if(userconfig.ssl && userconfig.ssl.cert) {
                Config.clientCert = fs.readFileSync(userconfig.ssl.cert, 'utf8');
            }

            if(userconfig.ssl && userconfig.ssl.key) {
                Config.clientKey = fs.readFileSync(userconfig.ssl.key, 'utf8');
            }
*/
            if(userconfig.relayID) {
                Config.relayID = userconfig.relayID;
            }

            /*
            p.push(new Promise(function(resolve1, reject1) {
                ddb.shared.get(appConsts.DDB_PREFIX_PATH+appConsts.DDB_SITE_ID).then(function(result) {
                    if(result === null || result.siblings.length === 0) {
                        log.info('No siteID found in ddb.shared\nUsing siteID fetched from config:',userconfig.siteID);
                        Config.siteID = userconfig.siteID;
                        var pollSiteID = setInterval(function() {
                            ddb.shared.get(appConsts.DDB_PREFIX_PATH+appConsts.DDB_SITE_ID).then(function(res) {
                                if(res === null || res.siblings.length === 0) {
                                    log.debug('No siteID found in ddb.shared');
                                } else {
                                    log.info('siteID now fetched from ddb:',res.siblings[0]);
                                    //TODO: Use this siteID for setting endpoint names of devices(that could or not be registered by now)
                                    clearInterval(pollSiteID);
                                }
                            })
                        }, 5000);
                        resolve1();
                    } else {
                        log.info('Using siteID fetched from ddb:',result.siblings[0]);
                        Config.siteID = result.siblings[0];
                        resolve1();
                    }
                }, function(err) {
                    log.info('Error reading siteID in ddb.shared', err,'\nUsing siteID fetched from config:',userconfig.siteID)
                    Config.siteID = userconfig.siteID;
                    resolve1();
                })
            }))
            */

            p.push(new Promise(function(resolve2, reject2) {
                ddb.shared.get(appConsts.DDB_PREFIX_PATH+appConsts.DDB_MBED_API_KEY).then(function(result) {
                    if(result === null || result.siblings.length === 0) {
                        log.info('No mbedAPIKey found in ddb.shared');
                        log.info('Using mbedAPIKey fetched from config:',userconfig.mbedAPIKey);
                        Config.mbedAPIKey = userconfig.mbedAPIKey;
                        resolve2();
                    } else {
                        var mbedAPIKey = result.siblings[0];
                        log.info('Using mbedAPIKey fetched from ddb:',mbedAPIKey);
                        Config.mbedAPIKey = mbedAPIKey;
                        resolve2();
                    }
                }, function(err) {
                    log.info('Error reading mbedAPIKey in ddb.shared', err)
                    log.info('Using mbedAPIKey fetched from config:',userconfig.mbedAPIKey);
                    Config.mbedAPIKey = userconfig.mbedAPIKey;
                    resolve2();
                })
            }))

            Config.spawnEdgeCore = userconfig.spawnEdgeCore;
            Config.edgeExecCmd = userconfig.edgeExecCmd;
            if(userconfig.spawnEdgeCore) {
                Config.spawnEdgeCore = userconfig.spawnEdgeCore;
            }
        }

        try {
            Config.ENDPOINT_PREFIX_TEMPLATE = handlebars.compile(Config.mbedEndpointDeviceTemplate);
        } catch(e) {
            log.error("mbed-devicejs-bridge: Failure to compile mbedEndpointDeviceTemplate. Using default.",e);
            Config.ENDPOINT_PREFIX_TEMPLATE = handlebars.compile(defaults.mbedEndpointDeviceTemplate);
        }

        try {
            Config.MAPRULES = require('./'+Config.mappingRules+'.js');
        } catch(e) {
            log.error("mbed-devicejs-bridge: Mapping rules failed to load or compile",e);
            Config.MAPRULES = require('./'+defaults.mappingRules+'.js');
        }

        if(Config.debug) {
            DBG = DBG_ON;
        }
        Promise.all(p).then(function() {
            resolve()
        }, function() {
            reject()
        })
    })
}



var mbed_bridge_controller = dev$.resource('MbedDeviceJSBridgeInstance', {

  start: function() {
      log.info('Starting MbedDeviceJSBridge dev$ controller');
      return true;
  },
  stop: function() {
      log.info("MbedDeviceJSBridge stopped");
      return true;
  },
  state: {
  },
  commands: {
    getMbedAPIKey: function() {
        if(Config.mbedAPIKey) {
            return Config.mbedAPIKey;
        } else {
            return 'mbedAPIKey not set yet';
        }
    },

    getDeviceMap: function() {
        if (Bridge) {
            return Bridge.cmd_getDeviceMap()            
        } else {
            ERROR("API failed - bridge is not started.")
            return false;
        }
//        return netstack.getCurrentPrimaryIpV4Address();
    },

    getEdgeClientStatus: function(hostname) {
        return { stuff: true }
//        return netstack.lookupHostname(hostname);
    }
  }
});

var bridge_controller = new mbed_bridge_controller('MbedDeviceJSBridge');

bridge_controller.start().then(function() {
    log.info('MbedDeviceJSBridge bridge controller up');
}, function(error) {
    log.error('mbed-devicejs-bridge: controller ERROR', error);
});

var getEdgeCoreStatus = function() {
    return new Promise(function(resolve, reject) {
        wget('http://localhost:'+Config.edgeHttpPort+'/status', function(err, resp, body) {
            if(err) {
                reject("Error getting edge-core status "+err);
            } else {
                resolve(body);
            }
        });
    })
}

var startBridge = function() {
    Bridge = new bridgeModule.Bridge()
    bridgeModule.setupConfig(Config);
//    log.debug("CONFIG:",Config)    
    if(Config.spawnEdgeCore) {
        if(Config.edgeExecCmd && Config.edgeExecCmd.length > 2) {
            DBG("Attempting to start edge-core daemon.")
            var argz = Config.edgeExecCmd;
            var execfile = argz.shift();
            var proc = child_process.execFile(execfile,argz);

            if(proc && proc.pid != undefined) {
                var failed = false;

                log.success("mbed-devicejs-bridge: edge-core started. PID %d",proc.pid)

                DBG("Waiting for edge-core to warm up before starting bridge. %d ms",Config.spawnEdgePause)
                setTimeout(function(){
                    if(!failed) {
                        DBG("Ok, going to start bridge.")
                        Bridge.start().then(function(){
                            log.success("mbed-devicejs-bridge: Bridge instance started.")
                        }, function(err) {
                            ERROR('Error starting bridge:',err)
                        });
                    } else {
                        ERROR("Not starting bridge. edge-core has failed.")
                    }
                },Config.spawnEdgePause);

                proc.stderr.on('data',function(d){
                    ERROR(util.format("stderr from edge-core >>%s<<",d))
                });

                proc.on('exit',function(){
                    ERROR("edge-core exited unexpectedly.")
                });            

                proc.on('error',function(err){
                    ERROR("edge-core failed to start or had error",err)
                    failed = true;
                })
            } else {
                ERROR("execFile API call to start edge-core failed.")
            }
        } else {
            log.error("mbed-devicejs-bridge is misconfigured!! It is set to spawnEdgeCore but has no edgeExecCmd or lacks correct switches")
        }
    } else {
        DBG("Not set to start edge-core")
        Bridge.start().then(function(){
            log.success("mbed-devicejs-bridge: Bridge instance started.")

            var interval = setInterval(function() {
                getEdgeCoreStatus().then(status => {
                    clearInterval(interval);
                    var device_id = JSON.parse(status)["internal-id"]
                    DBG("Writing",status,"as EdgeCoreStatus in ddb.shared")
                    ddb.shared.put('EdgeCoreStatus', status);

                    DBG("Writing",device_id,"as MbedDeviceID in ddb.shared")
                    ddb.shared.put('MbedDeviceID', device_id);
                }, err => {
                    ERROR(err);
                })
            }, 30000) // Store Relay's mbedDeviceID and edge-core status in ddb after 30 secs (successfully once)
            setInterval(function() {
                getEdgeCoreStatus().then(status => {
                    DBG("Writing",status,"as EdgeCoreStatus in ddb.shared")
                    ddb.shared.put('EdgeCoreStatus', status);

                    DBG("Writing",JSON.parse(status)["internal-id"],"as MbedDeviceID in ddb.shared")
                    ddb.shared.put('MbedDeviceID', JSON.parse(status)["internal-id"]);
                }, err => {
                    ERROR(err);
                })
            }, 28800000) // Every 8 hrs, store relay's mbedDeviceID and edge-core status in ddb
        }, function(err) {
            ERROR('Error starting bridge:',err)
        });

    }

}

// This is the script entry point:
require('devjs-configurator').configure('MbedDeviceJSBridge', __dirname)
  .then(function(data){
//    log.debug("config:",data);
    processConfig(data).then(function() {
        log.success("mbed-devicejs-bridge: Got user config. Config Loaded OK. Starting.");        
        startBridge()
    }, function() {
        log.error("mbed-devicejs-bridge: Config failed to load. Not starting.");
    })
},function(err){
    log.error("Problem with configuration in mbed-devicejs-brige:",err);
    processConfig(null).then(function() {
        log.success("mbed-devicejs-bridge: [fallback] Got user config. Config Loaded OK. Starting.");        
        startBridge()
    }, function() {
        log.error("mbed-devicejs-bridge: [fallback] Config failed to load. Not starting.");
    })
}).catch(function(err){
    log.error("Exception in mbed-devicejs-brige. Start failed. Failing:",err);
});



// setTimeout(function(){
//     dev$.select('id=*').listResources().then(function(res){
//         log.debug("dev$.select('id=*').listResources():",res)        
//     })

// },2000);





