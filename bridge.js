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

/**
 * Does the actual work of bridging deviceJS to mbed Edge client
 *
 * FIXME: For the time being, this bridge also talks directly to 
 * mbed Cloud for certain functions. Anything which requires talking
 * to mbed Cloud should later go through the Edge client.
 */

// third-party libraries and built-ins
const handlebars = require('handlebars');
const util = require('util');
// connectivity to mbed Edge server (localhost)
const Edge = require('../mbed-edge-websocket');
// Cloud connectivity only
const mbedCloudSDK = require('mbed-cloud-sdk');
// deviceJS utility functions
const devjsUtils = require('devjs-utils').instance(dev$);

const defaults = require('./defaults.js');
try {
    const mappingrules = require('./default-mapping.js');    
} catch(e) {
    console.error("default-mapping.js has error:",e)
}

const appEvents = require('./mbed-bridge-events.js')
const appLog = require('./bridge-log.js')

// Config for the module, passed from index.js
var Config = null;
// Edge lib instance
var edge = null;

// mbed Cloud lib instance
// this is reinstantiated if the API key changes
var mbedCloudDirectory = null;

// in memory map of devices which are mapped to mbed deviceID
// 
// by deviceJS Id
var MappedDevices = {};
var processQueue = [];

var getMappedDevice = function(devjsid) {
    return MappedDevices[devjsid];
}

// by Mbed "Endpoint name"
var MappedDevicesByMbedName = {};

var ERROR = function(){
    arguments[0] = "mbed-devicejs-bridge: " + arguments[0];
    log.error.apply(log,arguments);
}

var DBG_ON = function(){
    arguments[0] = "mbed-devicejs-bridge: " + arguments[0];
    log.debug.apply(log,arguments);
}

var DBG_OFF = function(){}

var DBG = DBG_OFF;

/**
 * And object which handles a single bridge to an mbed device - by deviceJS device ID
 * @param {[type]} devjsid [description]
 */
function EdgeHandler(devjsid){
    var self = this;
    this.deviceID = devjsid;
    this.mbedID = null;   // available from mbed Cloud after the device is registered
    this.mbed = null;     // mbed representation of device, using the Edge library - fetchMbedId()

    this.deviceJS = {};   // used to store deviceJS event handlers

    // These have to do with changes from mbed going to deviceJS
    this.ops = {
        // this maps ops with paths to handlers, so:
        // 'put' : {
        //    '/3311/0/5851' : function(){}
        // }
        // it is setup by setupBridingByFacades


        // put: function(){
        //     DBG("I AM A DEFAULT - SHOULD NOT BE CALLED")
        // },
        // post: function(){},
        // get: function(){}
    }

    // ok, this is the bounce back to mbed, *after* a value is set.
    // So, if edge-core says "set the dimmer to 30" then after we 
    // successfully set the value in deviceJS, we will call this 
    // to set it in edge-core - i.e. reflecting the value back
    // This is mapped to 'reflector' in each 'oma' entry
    this.ops_reflectors = {

    }

    this._ops_handlers = {
        // these are the functions which deal with each op ("put", "post", etc)
        // which are installed with 
        // self.mbed.on(op,handler())
    }

    // this.edgeOps = {
    //     _self: self,
    //     put: self.edgeOn_PUT.bind(self),
    //     post: self.edgeOn_POST.bind(self),
    //     get: self.edgeOn_GET.bind(self)   
    // }


    // setup the basics:

        
    var mbedName = Config.ENDPOINT_PREFIX_TEMPLATE({
        RELAY_ID: Config.relayID,
        DEVJS_ID: devjsid
    });
    if(mbedName.length > 64) {
        mbedName = Config.ENDPOINT_PREFIX_TEMPLATE({
            RELAY_ID: Config.relayID.slice(0, 64-(mbedName.length - Config.relayID.length)),
            DEVJS_ID: devjsid
        });
    }
    DBG("Will map",devjsid,"--> mbed:",mbedName);
    self.mbedName = mbedName;  // an alias / "Endpoint Name" we make up

    // these have to do with changes from deviceJS going to mbed

}

EdgeHandler.prototype.setupBridgingByDeviceId = async function(mappings) {
    // TODO
}

EdgeHandler.prototype.setupBridgingByType = async function(mappings) {
    // TODO
}

EdgeHandler.prototype.fetchMbedId = function(){
    var self = this;
    var alias = this.mbedName;
    return new Promise(function(resolve,reject){
        if(mbedCloudDirectory) {
            mbedCloudDirectory.listDevices({
                filter: {
                    alias: { $eq: alias }
                }
            },function(error,data){
                if(error) {
                    ERROR("Error from mbed Cloud API on listDevices(filter)",error);
                    reject(error);
                } else {
                    if(data && data.data && data.data.length > 0 && data.data[0].id) {
                        DBG("Looked up mbed ID. Alias",alias,"is mbed ID",data.data[0].id);
                        self.mbedID = data.data[0].id;
                        resolve(data.data[0].id);
                    } else {
                        ERROR("Malformed data from mbed Cloud listDevice() call:",data);
                        reject("malformed");
                    }
                }
            });                            
        } else {
            reject("no API");
        }
    });
}

EdgeHandler.prototype.masterOnOpHandler = function() {

}

// 
// Sets up all mapping based on deviceJS Facades / Interfaces
// 
EdgeHandler.prototype.setupBridgingByFacades = async function(mappings,interfaces,oma_paths) {

    var mappingObj = this;
    mappingObj.mbed = await edge.createCloudDevice(this.mbedName,"mbed-devicejs-bridge")

    var supportUpdate = false;

    //  
    //  Mbed Edge-core --------->  deviceJS 
    //  
    //  map each handler by "op" (GET, PUT, etc.) and "path" which might be something like "/3311/0/5851"
    //  Functions are defined in the "handlers" key, for each interface mapping
    //  

    for (var n=0; n<interfaces.length;n++) {
        if(mappings[interfaces[n]] &&
            mappings[interfaces[n]].oma &&
            mappings[interfaces[n]].handlers) {

            // TODO - check if the device can be updated via firmware, by looking at
            // if it implements the deviceJS firmware update facades, if so
            // then set supportUpdate to true, and setup the special deviceJS mapping for this.

            var handlers = mappings[interfaces[n]].handlers;
            var senders = mappings[interfaces[n]].senders;
            var oma = mappings[interfaces[n]].oma

            var setup_handlers = function(oma) {
//                if(!mappingObj.ops_reflectors)  mappingObj.ops_reflectors = {};
                for (var op_n=0;op_n<oma.operation.length;op_n++) {
                    if(typeof oma.operation[op_n] == 'string') {
                        var op = oma.operation[op_n].toLowerCase()
                        if(!mappingObj.ops[op])  mappingObj.ops[op] = {};

                        // assign and bind handlers to the mapped device
                        DBG("setup handler",oma.handler,"for devid",mappingObj.deviceID,"for <",op,">",oma.path);
                        mappingObj.ops[op][oma.path] = handlers[oma.handler].bind(mappingObj)
                    } else {
                        ERROR("Malformed value in operation array in oma path entry",oma.path,"for Facade mapping",interfaces[n])
                    }
                }
// reflector is disabled
                // if(oma.reflector && senders[oma.reflector])
                //     mappingObj.ops_reflectors[oma.path] = senders[oma.reflector].bind(mappingObj)
                // else {
                //     // throw an error if there is a PUT and there is no reflector set
                //     if(oma.operation && oma.operation.indexOf('PUT') > -1)
                //        ERROR("mapping for",oma.path,"for Facade mapping",interfaces[n],"has no reflector set or has invalid handler.")
                // }

                // NOTE: get handler needs to be wrapped in something which will unwrap it's promise.
                // However, it does not appear that the edge-core JS bindings support a 'GET' yet (or may never)
                if(oma.getHandler) {
                    if(!mappingObj.ops['get'])  mappingObj.ops['get'] = {};
                    if(handlers[oma.getHandler]) {
                        DBG("setup handler",oma.getHandler,"for devid",mappingObj.deviceID,"for < get >",oma.path);
                        mappingObj.ops['get'][oma.path] = handlers[oma.getHandler].bind(mappingObj)                        
                    } else { ERROR("mapping for",interfaces[n],"references getHandler",oma.getHandler,"but that handler not found.") }
                }
                if(oma.putHandler) {
                    if(!mappingObj.ops['put'])  mappingObj.ops['put'] = {};
                    if(handlers[oma.putHandler]) {
                        mappingObj.ops['put'][oma.path] = handlers[oma.putHandler].bind(mappingObj)
                    } else { ERROR("mapping for",interfaces[n],"references putHandler",oma.putHandler,"but that handler not found.") }
                }
                if(oma.postHandler) {
                    if(!mappingObj.ops['post'])  mappingObj.ops['post'] = {};
                    if(handlers[oma.postHandler]) {
                        mappingObj.ops['post'][oma.path] = handlers[oma.postHandler].bind(mappingObj)
                    } else { ERROR("mapping for",interfaces[n],"references postHandler",oma.postHandler,"but that handler not found.") }
                }
            }

            // setup mappings for inbound state changes from Edge server
            if(Array.isArray(oma)) {
                for (var p=0;p<oma.length;p++) {
                    if(oma[p].path && oma[p].handler && oma[p].operation) {
                        if(typeof handlers[oma[p].handler] == 'function') {
                            // assign the handler, to the EdgeHandler object created for this device.
                            setup_handlers(oma[p]);
                        } else {
                            ERROR("Mapping by Facade:",interfaces[n],"oma path",oma[p].path,"can't find handler:",oma[p].handler)
                        }
                    }
                }                
            } else {
               if(oma.path && oma.handler && oma.operation) {
                    if(typeof handlers[oma.handler] == 'function') {
                        // assign the handler, to the EdgeHandler object created for this device.
                        setup_handlers(oma);
                    } else {
                        ERROR("Mapping by Facade:",interfaces[n],"oma path",oma[p].path,"can't find handler:",oma[p].handler)
                    }
                }

            }

        }

    }


    // Now, register the devices with Edge server                
    var res = await mappingObj.mbed.register(oma_paths,
        supportUpdate  // if true, then we should get messages from edge-core on state changes
    );

    MbedDeviceStates[mappingObj.deviceID] = {}
    for (var n=0; n<interfaces.length;n++) {
        if(mappings[interfaces[n]] &&
            mappings[interfaces[n]].deviceJS.state) {
            MbedDeviceStates[mappingObj.deviceID][mappings[interfaces[n]].deviceJS.state] = mappings[interfaces[n]].oma.value;
        }
    }

    // install handler for all changes from mbed
    var ops = Object.keys(mappingObj.ops)
    for (var opn=0;opn<ops.length;opn++) {
        mappingObj._ops_handlers[ops[opn]] = function(self,op,route,newval,responseCB) {
            DBG("In _ops_handlers[",op,"] for device",self.deviceID)
            var devid = this.deviceID;
            if (self.ops[op] && self.ops[op][route]) {
                DBG("Found handler for device",self.deviceID,"for <",op,">",route,newval,this.deviceID)
                var devsel = dev$.selectByID(devid);
                // DBG("IGNORING STATE for",devid)
                // self.deviceJS._ignoreStateListeners = true;
                // self.deviceJS._ignoreEventListeners = true;                
                self.ops[op][route](devsel,op,route,newval).then(function(resp) {

                    if(resp && resp[devid] && resp[devid].receivedResponse === true) {
                        if(resp[devid].response.error === null) {
                            //Send success message to edge-core
                            responseCB(null, 'ok')
                            log.success("State passed from mbed to deviceJS for",devid);
                        } else {
                            //Send error why devicejs couldn't set it
                            responseCB(resp[devid].response.error, null)
                        }
                    } else {
                        responseCB('Device Unreachable', null)
                    }

                    // now, we successfully set the state. We need to now send it back to mbed
                    if(typeof self.ops_reflectors[route] == 'function') {
                        // get the value back from deviceJS (this could be different if the device controller ended 
                        // changing to a different value, etc.)

// reflector is disabled.

                        // dev$.selectByID(self.deviceID).get(self.deviceJS.state).then(function(resp){
                        //     if(resp && resp[devid] && resp[devid].response && !resp[devid].response.error) {
                        //         // translate to mbed
                        //         var mbedval = self.ops_reflectors[route](route,resp[devid].response.result);
                        //         // and set value on edge-core
                        //         (function(self,route,mbedval){
                        //             self.mbed.setValue(route,mbedval).then(function(){
                        //                 log.success("reflector: set mbed path",route,"for",devid,"ok:",mbedval);
                        //             }).catch(function(err){
                        //                 ERROR("Failed to set mbed path",route," value:",val,"devJS id:",devid," --> error:",err);
                        //             });
                        //         })(self,route,mbedval);
                        //     } else {
                        //         ERROR("reflector: Failed to get state back from device: --> error:",resp[devid].response.error);
                        //     }
                        // })
                    } else {
                        // ERROR("No reflector for route",route,"for device",devid,"- mbed will not get change.")
                    }
                    // atNextBridgeTick(function(self){
                    //     DBG("UNIGNORING STATE for",self.deviceID)
                    //     self.deviceJS._ignoreStateListeners = false;
                    //     self.deviceJS._ignoreEventListeners = false;
                    // }.bind(self,self));
                }).catch(function(err){
                    // atNextBridgeTick(function(self){
                    //     DBG("UNIGNORING STATE for",self.deviceID)
                    //     self.deviceJS._ignoreStateListeners = false;
                    //     self.deviceJS._ignoreEventListeners = false;
                    // }.bind(self,self));
                    responseCB('Error mapping data', null)
                    ERROR("Failed to map data from mbed to devicejs. Could not set state:",err)
                })
            } else {
                responseCB('No handler', null)
                ERROR("NO handler for device",devid,"for <",op,">",route)
            }
        }.bind(mappingObj,mappingObj,ops[opn])
        // assign to emitter from mbed
        DBG("assigning mbed handler for",ops[opn],"for device",this.deviceID);
        mappingObj.mbed.on(ops[opn],mappingObj._ops_handlers[ops[opn]])
    }

    mappingObj.mbedEndpointName = res;
    log.success("Registered",mappingObj.deviceID,"as mbed device (supportUpdate:",supportUpdate,")",mappingObj.mbedName,"(result:",res,")");


    //
    //  deviceJS --------->  Mbed Edge-core
    // 
    //  We install deviceJS listeners for both 'state' and 'event' for every device which is being mapped
    //  These listeners call 'senders' in each interface mapping
    //  

    mappingObj.deviceJS._stateSenders = {};   
    mappingObj.deviceJS._initSenders = {};   
    mappingObj.deviceJS._statePaths = {};    
    mappingObj.deviceJS._eventSenders = {};
    mappingObj.deviceJS._eventPaths = {};                

    // make state listener callbacks for all Facades
    // pre-bind() the resources from the Edge library
    // add these to the _listeners array, which master callback will dig through
    for (var n=0; n<interfaces.length;n++) {
        // map of 'state property name' (like "brightness") to onStateChangeToMbed function()
        if(mappings[interfaces[n]] &&
            mappings[interfaces[n]].oma &&
            mappings[interfaces[n]].senders) {

            var thismap = mappings[interfaces[n]];

            if(!mappingObj.deviceJS._initSenders[thismap.deviceJS.state]) {
                mappingObj.deviceJS._initSenders[thismap.deviceJS.state] = {}
            }
    
            mappingObj.deviceJS.initSender = function(mappingObj,thismap) {
                DBG("calling initSender() for",mappingObj.deviceID)
                var devid = mappingObj.deviceID
                if(mappingObj.deviceJS._initSenders) {

                    var runInit = function(result,mappingObj) {
                        var func_facades = Object.keys(mappingObj.deviceJS._initSenders)
                        for(var z=0;z<func_facades.length;z++) {
                            DBG("calling initSender() for",mappingObj.deviceID,func_facades[z],mappingObj.deviceJS._initSenders[func_facades[z]])
                            var omapaths = Object.keys(mappingObj.deviceJS._initSenders[func_facades[z]])
                            for(var p=0;p<omapaths.length;p++) {
                                DBG("calling initSender() for",mappingObj.deviceID,func_facades[z],mappingObj.deviceJS._initSenders[func_facades[z]],omapaths[p],result[func_facades[z]])
                                mappingObj.deviceJS._initSenders[func_facades[z]][omapaths[p]](result[func_facades[z]])
                            }
                        }
                    }
                    // get current state
                    var result = getCachedInitialState(devid)
                    if(!result) {
                        DBG("nothing available from DevStateManager cache for dev",devid,thismap.deviceJS.state)
                        dev$.selectByID(devid).get().then(function(resp){
                            if(resp && resp[devid] && resp[devid].response && resp[devid].response.error == null) {
                                runInit(resp[devid].response.result,mappingObj)
                            } else {
                                ERROR("(initSender) Failed to read device ID:",devid)
                            }
                        })
                    } else {
                        DBG("got cached (DevStateManager) initial data for dev",devid,thismap.deviceJS.state,":",result)
                        runInit(result,mappingObj)
                    }
                }
            }.bind(this,mappingObj,thismap);

            var processOmaSenders = function(obj) {
                if(obj.path) {

                    if (obj.eventSender && thismap.senders && thismap.senders[obj.eventSender]) {
                        if(thismap.deviceJS && thismap.deviceJS.event) {
                            mappingObj.deviceJS._eventPaths[thismap.deviceJS.event] = obj.path;
                            mappingObj.deviceJS._eventSenders[thismap.deviceJS.event] = thismap.senders[obj.eventSender].bind(mappingObj);
                        } else {
                            ERROR("mapping for deviceJS interface",interfaces[n],"has deviceJS.event entry but has eventSender(s)");
                        }
                    } else {
                        if(obj.eventSender)
                            ERROR("mapping for deviceJS interface",interfaces[n],"references non-existant event sender '"+obj.eventSender+"' (deviceID:",mappingObj.deviceID,")");
                    }
                    if (obj.stateSender && thismap.senders && typeof thismap.senders[obj.stateSender] == 'function') {
                        if(thismap.deviceJS && thismap.deviceJS.state) {
                            DBG("stateSender installed for",mappingObj.deviceID,"on state change '"+thismap.deviceJS.state+"'")
                            mappingObj.deviceJS._statePaths[thismap.deviceJS.state] = obj.path;
                            mappingObj.deviceJS._stateSenders[thismap.deviceJS.state] = thismap.senders[obj.stateSender].bind(mappingObj);
                        } else {
                            if(obj.stateSender)
                                ERROR("mapping for deviceJS interface",interfaces[n],"has deviceJS.state entry but has stateSender(s)");
                        }
                        // if initSend is true, then we need to get the initial state and send it to mbed
                        if(obj.initSend && thismap.deviceJS && thismap.deviceJS.state) {
                            mappingObj.deviceJS._initSenders[thismap.deviceJS.state][obj.path] = function(path,sender,thismap,omaobj,devjsval) {
                                //var ret = thismap.senders[obj.stateSender](path,devjsval)
//                                var sender = thismap.senders[obj.stateSender]
                                var devid = this.deviceID
                                var mapper = getMappedDevice(devid)
                                var mappingObj = this
                                var setit = function(sender,val) {
                                    DBG("setit()",arguments)
                                    // translate the value to mbed:
                                    val = sender(path,val)
                                    // set in mbed
                                    DBG("setit() val transformed",val)

                                    if (typeof val != 'undefined') {
                                        let r = mapper.mbed.resources[mapper.deviceJS._statePaths[thismap.deviceJS.state]];
                                        if(r){  
                                            (function(r,mapper,path,val,devid){
                                                DBG("(initSend) Attempting set on mbed path",path,"with val",val,"for dev",devid);
                                                mapper.mbed.setValue(path,val).then(function(){
                                                    log.success("(initSend) set mbed path",path,"for",devid,"ok:",val);
                                                    MbedDeviceStates[devid][thismap.deviceJS.state] = devjsval;
                                                }).catch(function(err){
                                                    ERROR("(initSend) Failed to set mbed path",path," value:",val,"devJS id:",devid," --> error:",err);
                                                })
                                            })(r,mapper,mapper.deviceJS._statePaths[thismap.deviceJS.state],val,devid);
                                        } else {
                                            ERROR("(initSend) Could not get resource from mbed representation of device",devid);
                                        }
                                    } else {
                                        ERROR("(initSend) Got 'undefined' back from stateSender for",path,"for device",devid);
                                    }
                                }.bind(this,thismap.senders[obj.stateSender])

                                DBG("bound setit() with",obj.stateSender)

                                /* We can rely on the DevStateManager results so just use that to setvalue
                                // use a getHandler if its defined
                                if (omaobj.getHandler && thismap.handlers && typeof thismap.handlers[omaobj.getHandler] == 'function') {
                                    thismap.handlers[omaobj.getHandler](dev$.selectByID(devid)).then(function(resp){
                                        if(resp && resp[devid] && resp[devid].response && !resp[devid].response.error) {
                                           DBG("using value from getHandler")
                                            setit(resp[devid].response.result)
                                        } else {
                                            ERROR("device",devid,"did report valid value back")
                                        }
                                    })
                                } else {
                                // otherwise use the current state object for the facade, which was provided already
                                    DBG("using value from main mapping.",thismap.deviceJS.state,devjsval)
                                    setit(devjsval)
                                }
                                */
                                DBG("using value from main mapping.",thismap.deviceJS.state,devjsval)
                                setit(devjsval)

                            }.bind(mappingObj,obj.path,thismap.senders[obj.stateSender],thismap,obj)//thismap.deviceJS.state
                        }
                    } else {
                        ERROR("mapping for deviceJS interface",interfaces[n],"references non-existant state sender '"+obj.stateSender+"' (deviceID:",mappingObj.deviceID,")");
                    }
                } else {
                    ERROR("mapping for deviceJS interface",interfaces[n],"has OMA path entry with no path!");
                }

            }

            // handle events
            if (Array.isArray(thismap.oma)) {
                // var paths = {};
                for(var p=0;p<thismap.oma.length;p++) {
                    processOmaSenders(thismap.oma[p])
                }
            } else {
                processOmaSenders(thismap.oma)
            }



        }                    
    }

    // _ignoreListener: If true, then the listener is not called
    // This is set to true when we just had a change from mbed, and don't
    // want to send such change back to mbed
    mappingObj.deviceJS._ignoreStateListeners = false;
    mappingObj.deviceJS._ignoreEventListeners = false;

    log.success("Mapping setup complete:",mappingObj.deviceID,"to mbed device.");
    MappedDevices[mappingObj.deviceID] = mappingObj;

}

var masterStateListener = function(devid,state,devjsval) {
    DBG("deviceJS  masterStateListener called for:",devid)
    var mapper = getMappedDevice(devid)
    if(mapper) {
        console.dir(arguments)
        if(!mapper.deviceJS._ignoreStateListeners) {
            if(mapper.deviceJS._stateSenders && mapper.deviceJS._stateSenders[state]) {
                var ret = mapper.deviceJS._stateSenders[state](mapper.deviceJS._statePaths[state],devjsval);
                if (typeof ret != 'undefined') {
                    let r = mapper.mbed.resources[mapper.deviceJS._statePaths[state]];
                    if(r){
                        (function(r,mapper,path,val,devid){
                            DBG("Attempting set on mbed path",path,"with val",val,"for dev",devid);
                            mapper.mbed.setValue(path,val).then(function(){
                                log.success("set mbed path",path,"for",devid,"ok:",val);
                                MbedDeviceStates[devid][state] = devjsval;
                            }).catch(function(err){
                                ERROR("Failed to set mbed path",path," value:",val,"devJS id:",devid," --> error:",err);
                            })
                        })(r,mapper,mapper.deviceJS._statePaths[state],ret,devid);
                    } else {
                        ERROR("Could not get resource from mbed representation of device",devid);
                    }
                } else {
                    ERROR("Got 'undefined' back from stateSender for",state,"for device",devid);
                }
            } else {
                DBG("NOTE: device",devid,"had state change:",state,devjsval,"but has no stateSender for this change.");
                console.dir(mapper)
            }
        } else {
            DBG("masterListener is ignoring stateListeners for deviceID:",devid);
        }
    } else {
        DBG("masterListener ignoring device not managed !! id:",devid);
    }
}

var masterEventListener = function(devid,event,devjsval){
    DBG("deviceJS  masterEventListener called for:",devid)
    console.dir(arguments)
    var mapper = getMappedDevice(devid)
    if(mapper) {
        if(!mapper.deviceJS._ignoreEventListeners) {
            if(mapper.deviceJS._eventSenders && mapper.deviceJS._eventSenders[event]) {
                var ret = mapper.deviceJS._eventSenders[event](mapper.deviceJS._eventPaths[event],devjsval);
                if (typeof ret != 'undefined') {
                    let r = mapper.mbed.resources[mapper.deviceJS._eventPaths[event]];
                    if(r){
                        (function(r,mapper,path,val,devid){
                            DBG("Attempting set on mbed path",path,"with val",val,"for dev",devid);
                            mapper.mbed.setValue(path,val).then(function(){
                                log.success("set mbed path",path,"for",devid,"ok:",val);
                                MbedDeviceStates[devid][event] = devjsval;
                            }).catch(function(err){
                                ERROR("Failed to set mbed path",path," value:",val,"devJS id:",devid," --> error:",err);
                            })
                        })(r,mapper,mapper.deviceJS._eventPaths[event],ret,devid);
                    } else {
                        ERROR("Could not get resource from mbed representation of device",devid);
                    }
                } else {
                    ERROR("Got 'undefined' back from eventSender for",event,"for device",devid);
                }
            } else {
                DBG("NOTE: device",devid,"had event:",event,devjsval,"but has no eventSender for this change.");
            }
        } else {
            DBG("masterEventListener is ignoring. deviceID:",devid)
        }
    } else {
        DBG("masterEventListener called for device not managed !! id:",devid);
    }
}

var getInterfaces = function(devid) {
    return new Promise(async function(resolve, reject) {
        try {
            DBG("Fetching interfaces for "+devid)
            interfaces = await devjsUtils.listInterfacesOfDevices(devid);
            resolve(interfaces)
        } catch(ex) {
            ERROR("devjsUtils listInterfacesOfDevices "+devid+" failed, err: "+ex)
            var a = setInterval(async function(){
                try {
                    DBG("Fetching interfaces for "+devid)
                    interfaces = await devjsUtils.listInterfacesOfDevices(devid);
                    clearInterval(a)
                    resolve(interfaces)
                } catch(ex) {
                    ERROR("devjsUtils listInterfacesOfDevices "+devid+" failed, err: "+ex)
                }
            }, 20000)
        }
    })
}

var processNewDevice = async function(devid,devdata) {
    var ret = {};
    DBG("processNewDevice for",devid);
    // See if the device should be processed:
    var checkDevice = function(){
        // if its in the whitelist, do it
        if(MappedDevices[devid]) {
            log.info("mbed-devicejs-brige: Ignoring device",devid,"->already registered.");
            return false;
        } else if(devdata.type.indexOf('Mbed') > -1) {
            log.info("mbed-devicejs-brige: Ignoring device",devid,"->edge-core device.");
            return false;
        } else if(processQueue.indexOf(devid) > -1) {
            log.info("mbed-devicejs-brige: Ignoring device",devid,"->Registration in process already.");
            return false;
        } else if(!Config.WHITELIST_BY_ID[devid]) {
            if(Config.whiteListOnly) {
                return false;
            }        
            // drop if in the exclude ID list
            if(Config.IGNORE_BY_ID[devid]) {
                return false;
            }

            return true;
        } else {
            return true;
        }
    }

    if(!checkDevice(devid,devdata)) {
        log.info("mbed-devicejs-brige: Ignoring device",devid);
        ret[devid] = false;
    } else {
        processQueue.push(devid);
        if(Config.MAPRULES.byDeviceId[devid]) {
            // TODO
            ret[devid] = true;
        } else
        if(Config.MAPRULES.byDeviceType[devdata.type]) {
            // TODO
            ret[devid] = true;

        } else {
            var interfaces
            if(devdata.interfaces) {
                interfaces = devdata.interfaces;
            } else {
                interfaces = await getInterfaces(devid);
            }
            var oma_paths = [];

            DBG("See interfaces for "+devid+":",interfaces);

            var mappings = {};
            // get Facades for the given device Type
            // build mbed representation based on this.
            for (var n=0; n<interfaces.length;n++) {
                if(Config.MAPRULES.byFacade[interfaces[n]] &&
                    typeof Config.MAPRULES.byFacade[interfaces[n]] == 'function') {
                    var mapping = Config.MAPRULES.byFacade[interfaces[n]]();
                    mappings[interfaces[n]] = mapping;
                    if(mapping.oma) {
                        DBG("Found mapping for device",devid,"Facade",interfaces[n]);
                        if (Array.isArray(mapping.oma)) {
                            for(var q=0;q<mapping.oma.length;q++) {
                                oma_paths.push(mapping.oma[q]);
                            }
                        } else {
                            oma_paths.push(mapping.oma);
                        }
                    }
                    if(mapping.static_oma) {
                        DBG("Found static mapping for device",devid,"Facade",interfaces[n]);
                        if (Array.isArray(mapping.static_oma)) {
                            for(var q=0;q<mapping.static_oma.length;q++) {
                                oma_paths.push(mapping.static_oma[q]);
                            }
                        } else {
                            oma_paths.push(mapping.static_oma);
                        }
                    }
                }
            }

            if (oma_paths.length > 0) { 
                var mappingObj = new EdgeHandler(devid);

                MappedDevices[devid] = mappingObj;
                await mappingObj.setupBridgingByFacades(mappings,interfaces,oma_paths);
                // setupBridgingByFacades will reassign to MappedDevices[] when complete 

                // wait 5 seconds, then send initial data to mbed
                if(mappingObj.deviceJS.initSender) {
                    setTimeout(mappingObj.deviceJS.initSender,5000)
                }
                mappingObj.fetchMbedId().then(function(){},function(error){
                    ERROR("Failed to retrieve mbed ID for device "+devid,error);
                });
                MappedDevicesByMbedName[mappingObj.mbedName] = mappingObj;
                ret[devid] = true;
            }

        }


    }
    processQueue.splice(processQueue.indexOf(devid),1)
    return ret;
}

// pass in the deviceJS ID
var removeDevice = async function(id) {
    if(MappedDevices[id]) {
        var mapped = MappedDevices[id]
        //if(mapped.mbedID) {
            if (mapped.mbed) {
                await mapped.mbed.deregister()
            }
            delete MappedDevices[id]
            delete MbedDeviceStates[id]
            return edge.deleteDevice(mapped.mbedID)
        // } else {
        //     ERROR("Trying to call removeDevice, but mbedID is null for deviceJS ID:",id)
        //     return Promise.reject(new Error("Trying to call removeDevice, but mbedID is null for deviceJS ID:"+id))
        // }
    } else {
        return Promise.reject(new Error("Can't find a mapped ID of "+id))
    }
}


var startEdge = async function(){
    //edge = new Edge('localhost', Config.localEdgePort, 'mbed-devicejs-bridge');
    edge = new Edge(Config.socket_path, Config.pt_api_path, Config.mgmt_api_path, 'mbed-devicejs-bridge');
    await edge.init();
}


var _nextBridgeTickCBs = [];

var atNextBridgeTick = function(cb){
    _nextBridgeTickCBs.push(cb)
}

var Z = 0; var Z2 = 0;
var nextBridgeTick = function() {
    if(Z%3 == 0) {
        log.debug("mbed-devicejs-bridge: mbed deviceJS bridge is up [",Z2,"]")
//        console.dir(getMappedDevice('VirtualLightBulb10'))
        Z2++;
    }
    Z++;
    for (var n=0;n<_nextBridgeTickCBs.length;n++) {
            try {
            _nextBridgeTickCBs[n]();
        } catch(e) {
            ERROR("Error on bridge nextTick:",e);
        }
    }    
    _nextBridgeTickCBs = [];
}

var InitialDeviceStates = {};
var MbedDeviceStates = {};

var getCachedInitialState = function(devid) {
    if(InitialDeviceStates[devid] && InitialDeviceStates[devid].state) {
        return InitialDeviceStates[devid].state
    }
    return null
}

/**
 * @class Bridge
 * This internal class is used to drive the bridge functions here.
 * For now, only one instance of this class is supported.
 */
var Bridge = function() {

    this.start = function(obj) {
        return new Promise(function(resolve,reject){
        //    console.log("mbed deviceJS bridge starting...");
            log.info("mbed deviceJS bridge starting...");

            // sanity check loop
            setInterval(function(){
                nextBridgeTick()
            },1500);

            startEdge()
            .then(function(){
                setInterval(function(){
                    dev$.selectByID('DevStateManager').get('data').then(function(resp){
                        if(resp && resp.DevStateManager && resp.DevStateManager.response && resp.DevStateManager.response.result) {
                            DBG("(DSM) polled data successfully")

                            DeviceStates = resp.DevStateManager.response.result
                            Object.keys(MbedDeviceStates).forEach(devid => {
                                Object.keys(MbedDeviceStates[devid]).forEach(state => {
                                    if(DeviceStates[devid][state] &&
                                        ((typeof MbedDeviceStates[devid][state] == 'object' && JSON.stringify(MbedDeviceStates[devid][state]) != JSON.stringify(DeviceStates[devid][state])) || 
                                        (typeof MbedDeviceStates[devid][state] != 'object' && MbedDeviceStates[devid][state] != DeviceStates[devid][state]))) {
                                        mapper = getMappedDevice(devid);
                                        if(mapper.deviceJS._stateSenders && mapper.deviceJS._stateSenders[state]) {
                                            var ret = mapper.deviceJS._stateSenders[state](mapper.deviceJS._statePaths[state],DeviceStates[devid][state]);
                                            if (typeof ret != 'undefined') {
                                                let r = mapper.mbed.resources[mapper.deviceJS._statePaths[state]];
                                                if(r){
                                                    (function(r,mapper,path,val,devid){
                                                        DBG("(DSM) Attempting set on mbed path",path,"with val",val,"for dev",devid);
                                                        mapper.mbed.setValue(path,val).then(function(){
                                                            log.success("set mbed path",path,"for",devid,"ok:",val);
                                                            MbedDeviceStates[devid][state] = DeviceStates[devid][state];
                                                        }).catch(function(err){
                                                            ERROR("Failed to set mbed path",path," value:",val,"devJS id:",devid," --> error:",err);
                                                        })
                                                    })(r,mapper,mapper.deviceJS._statePaths[state],ret,devid);
                                                } else {
                                                    ERROR("(DSM) Could not get resource from mbed representation of device",devid);
                                                }
                                            } else {
                                                ERROR("(DSM) Got 'undefined' back from stateSender for",state,"for device",devid);
                                            }
                                        } else {
                                            DBG("(DSM) NOTE: device",devid,"had state change:",state,DeviceStates[devid][state],"but has no stateSender for this change.");
                                        }
                                    }
                                })
                            })

                        } else {
                            ERROR("DevStateManager polled malformed data:",resp)
                        }
                    }, function(e){
                        ERROR("DevStateManager missing or failing:",e)
                    })
                }, 30000)

                // first let's get the initial state of devices from DevStateManager, and try to use this, as it will make startup faster
                return dev$.selectByID('DevStateManager').get('data').then(function(resp){
                    if(resp && resp.DevStateManager && resp.DevStateManager.response && resp.DevStateManager.response.result) {
                        InitialDeviceStates = resp.DevStateManager.response.result
                        DBG("DevStateManager cache filled.",InitialDeviceStates)
                    }
                }).catch(function(e){
                    ERROR("DevStateManager missing or failing")
                })
            })
            .then(function(){
                log.success("mbed-devicejs-bridge: Connected to local Edge server on socket",Config.socket_path);

                if(Config.mbedAPIKey) {
                    mbedCloudDirectory = new mbedCloudSDK.DeviceDirectoryApi({
                        apiKey: Config.mbedAPIKey
                    });
                    resolve();
                } else {
                    ERROR("No mbed Cloud API Key provided. This funtionality will fail.");
                    reject();
                }

                // first scan current devices...
                dev$.select(Config.selectionForDiscovery).listResources().then(function(res){
                    var keyz = Object.keys(res).filter(id => {return res[id].registered == true});
                    for(var n=0;n<keyz.length;n++) {
                        processNewDevice(keyz[n],res[keyz[n]]).then(function(res){
                            DBG("Device processed:",res)
                        }).catch(function(err){
                            ERROR("Device failed to process:",err);
                        });
                    }
                });

                var sel = dev$.select("id=*");
                sel.on('state',masterStateListener)
                sel.subscribeToState('+');

                var allDiscover = dev$.select('id=*');
                allDiscover.subscribeToEvent('discovery');
                allDiscover.on('event', function(id, type, data) { 
                    console.log('Discovery- Device ' + id + ' type ' + type + ' data ' + JSON.stringify(data)); 
                    if(type == 'discovery' && data.definition.name) {
                        DBG("mbed bridge: discover device:",util.inspect(arguments,{depth:null}))

                        var devdata = {}
                        if(data.definition.name) devdata.type = data.definition.name
                        if(data.definition.interfaces) devdata.interfaces = data.definition.interfaces

                        processNewDevice(id,devdata).then(function(res){
                            DBG("Device "+id+" processed:",res)
                        }).catch(function(err){
                            ERROR("Device "+id+" failed to process:",err);
                        });                        
                    } else {
                        DBG("ignoring event:",util.inspect(arguments,{depth:null}))
                    }
                });

                // watch for 'unregister'
                var allDiscover = dev$.select('id=*');
                allDiscover.subscribeToEvent('unregister');
                allDiscover.on('event', function(id, type, data) { 
//                    console.log('Discovery- Device ' + id + ' type ' + type + ' data ' + JSON.stringify(data)); 
// Event- Device VirtualTemperature31 type unregister data {"definition":{"name":"Core/Devices/Virtual/Temperature","version":"0.0.1","interfaces":["Facades/HasTemperature"]}}
                    DBG("mbed bridge: saw unregister device:",util.inspect(arguments,{depth:null}))
                    removeDevice(id).then(function(){
                        DBG("mbed bridge: removed device from edge-core:",id)                        
                    }).catch(function(e){
                        DBG("mbed bridge: could not remove device from edge-core:",id,e)
                    })

                });

                
            }).catch(function(e){
                ERROR("Failed to start the mbed Edge JS client:",e)
                reject(e)
            });

            DBG("past startEdge()")
        })
    }
    this.stop = async function(){
        if(edge) {
            await edge.deinit();
        }
    }
    // state: {

    // },
    this.cmd_getDeviceMap = function() {
        DBG("in cmd_getDeviceMap")
        return new Promise(function(resolve){
            var ret = {};
            var keyz = Object.keys(MappedDevices);
            for(var n=0;n<keyz.length;n++) {
                ret[keyz[n]] = {
//                        mbed_id:
                    mbed_endpoint_name: MappedDevices[keyz[n]].mbedEndpointName,
                    mbed_id: MappedDevices[keyz[n]].mbedID
                }
            }
            resolve(ret);
        });
    }
}

// if the mbed API key changes, recreate the Directory API instance
appEvents.events().on(appEvents.EVENT_NEW_MBED_API_KEY,(key) => {
    Config.mbedAPIKey;
    DBG("Resetting mbedCloudDirectory - new API key")
    mbedCloudDirectory = new mbedCloudSDK.DeviceDirectoryApi({
        apiKey: Config.mbedAPIKey
    });    
})


var enableBridgeDebugging = function(){
    DBG = DBG_ON;
    appLog.debug(true)
}

module.exports = {
    enableBridgeDebugging: enableBridgeDebugging,
    setupConfig: function(config) {
        enableBridgeDebugging();
        Config = config;
    },
    Bridge: Bridge
//    Bridge: dev$.resource('MbedDeviceJSBridgeInstance', Bridge)
}
