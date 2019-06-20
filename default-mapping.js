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

// default mapping
const wget = require('node-wget')

var ERROR = function(){
    arguments[0] = "mbed-devicejs-bridge: " + arguments[0];
    log.error.apply(log,arguments);
}

var DBG = function(){
    arguments[0] = "mbed-devicejs-bridge: " + arguments[0];
    log.debug.apply(log,arguments);
}


/**
 * Mapping object explained:
 *
 * When a new device is seen in deviceJS, the bridge software will check for a mapping.
 *
 * #1 - It will first see if an entry for the specific device ID exists. In almost ALL cases, 
 * there should be no entry.
 *
 * #2 - It will check to see if the Device's deviceJS Type has a custom mapping. In MOST cases
 * there should be no entry. The only time this will be used is when we have a very special device
 * which is not well described by deviceJS Facades.
 *
 * #3 - It will check to see the mappings which exist for the Facades the device implements. The 
 * amalgamation of these mappings are the final mapping for the device to LwM2M
 * 
 * 
 * @type {Object}
 */
module.exports = {

    // onStateChangeFromMbed
    //    .put 
    //    .post
    //       called when the bridge sees a requested change, coming from mbed
    // onStateChangeToMbed(resources,state) - called when deviceJS sees a change which should reflect in mbed
    //   where 'resources' is the object from the edge-lib, where you can call .setValue()
    //   and where 'state' is the state object from deviceJS


    // recommended way
    byFacade: {
        'Facades/HasTemperature': function() {
            // /3303  "temp sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3303
            // /5700  Sensor value R float
            return {
                deviceJS: {
                    state: 'temperature',
                    event: 'temperature'
                },
                handlers: {
                    get_temp: function(Dev) {
                        DBG("Got Facade/HasTemperature 'get_temp'")
                        return Dev.get('temperature')
                    }
                },
                senders: {
                    send: function(path,val) {
                        // right now deviceJS normalize to Fahrenheit. Will use Celsius in future.
                        DBG("stateSender -> temperature changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3303/0/5700',
                    operation: ['GET'],
                    initSend:true,
                    getHandler: 'get_temp',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3303/0/5603',
                        operation: ['GET'],
                        value: 0.0
                    },
                    {   // max possible value
                        path: '/3303/0/5604',
                        operation: ['GET'],
                        value: 200.0
                    }
                ]
            }
        },
        'Facades/TemperatureDisplayMode': function() {
            // /3303  "temp sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3303
            // /5701  Sensor Units R String
            return {
                deviceJS: {
                    state: 'temperatureDisplayMode'
                },
                handlers: {
                    put_tempDispMode: function(Dev,op,route,value) {
                        DBG("Got Facade/TemperatureDisplayMode 'put_tempDispMode' -> put(",route,value,")")
                        return Dev.set('temperatureDisplayMode', value);
                    },
                    get_tempDispMode: function(Dev) {
                        DBG("Got Facade/TemperatureDisplayMode 'get_tempDispMode'")
                        return Dev.get('temperatureDisplayMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> temperatureDisplayMode changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3303/0/5701',
                    operation: ['GET'],
                    initSend:true,
                    handler: 'put_tempDispMode',
                    getHandler: 'get_tempDispMode',
                    value: "celsius",
                    stateSender: 'send'
                }
            }
        },
        'Facades/ThermostatReturnTemperature': function() {
            // /3303  "temp sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3303
            // /1 Return Temp for us
            // /5700  Sensor value
            return {
                deviceJS: {
                    state: 'returnTemperature',
                    event: 'returnTemperature'
                },
                handlers: {
                    get_retTemp: function(Dev) {
                        DBG("Got Facade/ThermostatReturnTemperature 'get_retTemp'")
                        return Dev.get('returnTemperature')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> returnTemperature changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3303/1/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_retTemp',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatSupplyTemperature': function() {
            // /3303  "temp sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3303
            // /2     Supply Temp for us
            return {
                deviceJS: {
                    state: 'supplyTemperature',
                    event: 'supplyTemperature'
                },
                handlers: {
                    get_supTemp: function(Dev) {
                        DBG("Got Facade/ThermostatSupplyTemperature 'get_supTemp'")
                        return Dev.get('supplyTemperature')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> supplyTemperature changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3303/2/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_supTemp',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/hasWhiteTemp': function() {
            // /3303  "temp sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3303
            // /3     WhiteTemp for us
            return {
                deviceJS: {
                    state: 'K'
                },
                handlers: {
                    get_K: function(Dev) {
                        DBG("Got Facade/hasWhiteTemp 'get_K'")
                        return Dev.get('K')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> K changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3303/3/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_K',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3303/3/5603',
                        operation: ['GET'],
                        value: 1000
                    },
                    {   // max possible value
                        path: '/3303/3/5604',
                        operation: ['GET'],
                        value: 10000
                    }
                ]
            }
        },
        // 'Facades/AutoTemperatureLevel': function() {
        //     return {
        //         deviceJS: {
        //             state: 'autoTemperatureLevel'
        //         },
        //         handlers: {
        //             put_autoTempLevel: function(Dev,op,route,value){
        //                 DBG("Got Facade/AutoTemperatureLevel 'put_autoTempLevel' -> put(",route,value,")")
        //                 return Dev.set('autoTemperatureLevel', value);
        //             },
        //             get_autoTempLevel: function(Dev) {
        //                 DBG("Got Facade/AutoTemperatureLevel 'get_autoTempLevel'")
        //                 return Dev.get('autoTemperatureLevel')
        //             }
        //         },
        //         senders: {
        //             send: function(path,val) {
        //                 return val;
        //             }
        //         },
        //         oma: {
        //             path: '/3308/0/5900',
        //             operation: ['PUT','GET'],
        //             handler: 'put_autoTempLevel',
        //             getHandler: 'get_autoTempLevel',
        //             value: 1,
        //             stateSender: 'send'
        //         }
        //     }
        // },
        'Facades/CoolTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /1 CoolTemperatureLevel for us
            // /5900  Set point value RW float
            return {
                deviceJS: {
                    state: 'coolTemperatureLevel',
                    event: 'coolTemperatureLevel'
                },
                handlers: {
                    put_coolTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/CoolTemperatureLevel 'put_coolTempLevel' -> put(",route,value,")")
                        return Dev.set('coolTemperatureLevel', value);
                    },
                    get_coolTempLevel: function(Dev) {
                        DBG("Got Facade/CoolTemperatureLevel 'get_coolTempLevel'")
                        return Dev.get('coolTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> coolTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/1/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_coolTempLevel',
                    getHandler: 'get_coolTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/HeatTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /2 HeatTemperatureLevel for us
            // /5900  Set point value
            return {
                deviceJS: {
                    state: 'heatTemperatureLevel',
                    event: 'heatTemperatureLevel'
                },
                handlers: {
                    put_heatTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/HeatTemperatureLevel 'put_heatTempLevel' -> put(",route,value,")")
                        return Dev.set('heatTemperatureLevel', value);
                    },
                    get_heatTempLevel: function(Dev) {
                        DBG("Got Facade/HeatTemperatureLevel 'get_heatTempLevel'")
                        return Dev.get('heatTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> heatTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/2/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_heatTempLevel',
                    getHandler: 'get_heatTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        // 'Facades/OccupiedAutoTemperatureLevel': function() {
        //     // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
        //     // /3 OccupiedAutoTemperatureLevel for us
        //     // /5900  Set point value
        //     return {
        //         deviceJS: {
        //             state: 'occupiedAutoTemperatureLevel'
        //         },
        //         handlers: {
        //             put_occAutoTempLevel: function(Dev,op,route,value){
        //                 DBG("Got Facade/OccupiedAutoTemperatureLevel 'put_occAutoTempLevel' -> put(",route,value,")")
        //                 return Dev.set('occupiedAutoTemperatureLevel', value);
        //             },
        //             get_occAutoTempLevel: function(Dev) {
        //                 DBG("Got Facade/OccupiedAutoTemperatureLevel 'get_occAutoTempLevel'")
        //                 return Dev.get('occupiedAutoTemperatureLevel')
        //             }
        //         },
        //         senders: {
        //             send: function(path,val) {
        //                 DBG("stateSender -> occupiedAutoTemperatureLevel changed. transforming for mbed. ",path,val)
        //                 return val;
        //             }
        //         },
        //         oma: {
        //             path: '/3308/3/5900',
        //             operation: ['PUT','GET'],
        //             handler: 'put_occAutoTempLevel',
        //             getHandler: 'get_occAutoTempLevel',
        //             value: 1,
        //             stateSender: 'send'
        //         }
        //     }
        // },
        'Facades/OccupiedCoolTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /4 OccupiedCoolTemperatureLevel for us
            // /5900  Set point value
            return {
                deviceJS: {
                    state: 'occupiedCoolTemperatureLevel',
                    event: 'occupiedCoolTemperatureLevel'
                },
                handlers: {
                    put_occCoolTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/OccupiedCoolTemperatureLevel 'put_occCoolTempLevel' -> put(",route,value,")")
                        return Dev.set('occupiedCoolTemperatureLevel', value);
                    },
                    get_occCoolTempLevel: function(Dev) {
                        DBG("Got Facade/OccupiedCoolTemperatureLevel 'get_occCoolTempLevel'")
                        return Dev.get('occupiedCoolTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> occupiedCoolTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/4/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_occCoolTempLevel',
                    getHandler: 'get_occCoolTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/OccupiedHeatTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /5 OccupiedHeatTemperatureLevel for us
            // /5900  Set point value
            return {
                deviceJS: {
                    state: 'occupiedHeatTemperatureLevel',
                    event: 'occupiedHeatTemperatureLevel'
                },
                handlers: {
                    put_occHeatTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/OccupiedHeatTemperatureLevel 'put_occHeatTempLevel' -> put(",route,value,")")
                        return Dev.set('occupiedHeatTemperatureLevel', value);
                    },
                    get_occHeatTempLevel: function(Dev) {
                        DBG("Got Facade/OccupiedHeatTemperatureLevel 'get_occHeatTempLevel'")
                        return Dev.get('occupiedHeatTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> occupiedHeatTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/5/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_occHeatTempLevel',
                    getHandler: 'get_occHeatTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        // 'Facades/UnocupiedAutoTemperatureLevel': function() {
        //     // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
        //     // /6 UnoccupiedAutoTemperatureLevel for us
        //     // /5900  Set point value
        //     return {
        //         deviceJS: {
        //             state: 'unoccupiedAutoTemperatureLevel'
        //         },
        //         handlers: {
        //             put_unoccAutoTempLevel: function(Dev,op,route,value){
        //                 DBG("Got Facade/UnocupiedAutoTemperatureLevel 'put_unoccAutoTempLevel' -> put(",route,value,")")
        //                 return Dev.set('unOccupiedAutoTemperatureLevel', value);
        //             },
        //             get_unoccAutoTempLevel: function(Dev) {
        //                 DBG("Got Facade/UnocupiedAutoTemperatureLevel 'get_unoccAutoTempLevel'")
        //                 return Dev.get('unOccupiedAutoTemperatureLevel')
        //             }
        //         },
        //         senders: {
        //             send: function(path,val) {
        //                 DBG("stateSender -> unoccupiedAutoTemperatureLevel changed. transforming for mbed. ",path,val)
        //                 return val;
        //             }
        //         },
        //         oma: {
        //             path: '/3308/6/5900',
        //             operation: ['PUT','GET'],
        //             handler: 'put_unoccAutoTempLevel',
        //             getHandler: 'get_unoccAutoTempLevel',
        //             value: 1,
        //             stateSender: 'send'
        //         }
        //     }
        // },
        'Facades/UnoccupiedCoolTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /7 UnoccupiedCoolTemperatureLevel for us
            // /5900  Set point value
            return {
                deviceJS: {
                    state: 'unoccupiedCoolTemperatureLevel',
                    event: 'unoccupiedCoolTemperatureLevel'
                },
                handlers: {
                    put_unoccCoolTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/UnoccupiedCoolTemperatureLevel 'put_unoccCoolTempLevel' -> put(",route,value,")")
                        return Dev.set('unoccupiedCoolTemperatureLevel', value);
                    },
                    get_unoccCoolTempLevel: function(Dev) {
                        DBG("Got Facade/UnoccupiedCoolTemperatureLevel 'get_unoccCoolTempLevel'")
                        return Dev.get('unoccupiedCoolTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> unoccupiedCoolTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/7/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_unoccCoolTempLevel',
                    getHandler: 'get_unoccCoolTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/UnoccupiedHeatTemperatureLevel': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /8 UnoccupiedHeatTemperatureLevel for us
            // /5900  Set point value
            return {
                deviceJS: {
                    state: 'unoccupiedHeatTemperatureLevel',
                    event: 'unoccupiedHeatTemperatureLevel'
                },
                handlers: {
                    put_unoccHeatTempLevel: function(Dev,op,route,value){
                        DBG("Got Facade/UnoccupiedHeatTemperatureLevel 'put_unoccHeatTempLevel' -> put(",route,value,")")
                        return Dev.set('unoccupiedHeatTemperatureLevel', value);
                    },
                    get_unoccHeatTempLevel: function(Dev) {
                        DBG("Got Facade/UnoccupiedHeatTemperatureLevel 'get_unoccHeatTempLevel'")
                        return Dev.get('unoccupiedHeatTemperatureLevel')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> unoccupiedHeatTemperatureLevel changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/8/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_unoccHeatTempLevel',
                    getHandler: 'get_unoccHeatTempLevel',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatDeadband': function() {
            // /3308  "Set Point" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3308
            // /9 Deadband for us
            return {
                deviceJS: {
                    state: 'deadband',
                    event: 'deadband'
                },
                handlers: {
                    put_deadband: function(Dev,op,route,value){
                        DBG("Got Facade/ThermostatDeadband 'put_deadband' -> put(",route,value,")")
                        return Dev.set('deadband', value);
                    },
                    get_deadband: function(Dev) {
                        DBG("Got Facade/ThermostatDeadband 'get_deadband'")
                        return Dev.get('deadband')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> deadband changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3308/9/5900',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_deadband',
                    getHandler: 'get_deadband',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatMode': function() {
            // /3341  "Addressable Text Display" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3341
            // /0 ThermostatMode for us
            // /5527  Text RW string
            return {
                deviceJS: {
                    state: 'thermostatMode',
                    event: 'thermostatMode'
                },
                handlers: {
                    put_thermostatMode: function(Dev,op,route,value){
                        DBG("Got Facade/ThermostatMode 'put_thermostatMode' -> put(",route,value,")")
                        return Dev.set('thermostatMode', value);
                    },
                    get_thermostatMode: function(Dev) {
                        DBG("Got Facade/ThermostatMode 'get_thermostatMode'")
                        return Dev.get('thermostatMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatMode changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/0/5527',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_thermostatMode',
                    getHandler: 'get_thermostatMode',
                    value: "off",
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/OccupancyMode': function() {
            return {
                deviceJS: {
                    state: 'occupancyMode',
                    event: 'occupancyMode'
                },
                handlers: {
                    put_occMode: function(Dev,op,route,value){
                        DBG("Got Facade/OccupancyMode 'put_occMode' -> put(",route,value,")")
                        return Dev.set('occupancyMode',value)
                    },
                    get_occMode: function(Dev) {
                        DBG("Got Facade/ThermostatFanMode 'get_occMode'")
                        return Dev.get('occupancyMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> occupancyMode changed. transforming for mbed. ",path,val)
                        return val
                    }
                },
                oma: {
                    path: '/3341/1/5527',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_occMode',
                    getHandler: 'get_occMode',
                    value: "unoccupied",
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatFanMode': function() {
            return {
                deviceJS: {
                    state: 'thermostatFanMode',
                    event: 'thermostatFanMode'
                },
                handlers: {
                    put_thermostatFanMode: function(Dev,op,route,value){
                        DBG("Got Facade/ThermostatFanMode 'put_thermostatFanMode' -> put(",route,value,")")
                        return Dev.set('thermostatFanMode', value);
                    },
                    get_thermostatFanMode: function(Dev) {
                        DBG("Got Facade/ThermostatFanMode 'get_thermostatFanMode'")
                        return Dev.get('thermostatFanMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatFanMode changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/2/5527',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_thermostatFanMode',
                    getHandler: 'get_thermostatFanMode',
                    value: "off",
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatOccupiedFanMode': function() {
            return {
                deviceJS: {
                    state: 'thermostatOccupiedFanMode',
                    event: 'thermostatOccupiedFanMode'
                },
                handlers: {
                    put_thermoOccFanMode: function(Dev,op,route,value){
                        DBG("Got Facade/ThermostatOccupiedFanMode 'put_thermoOccFanMode' -> put(",route,value,")")
                        return Dev.set('thermostatOccupiedFanMode', value);
                    },
                    get_thermoOccFanMode: function(Dev) {
                        DBG("Got Facade/ThermostatOccupiedFanMode 'get_thermoOccFanMode'")
                        return Dev.get('thermostatOccupiedFanMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatOccupiedFanMode changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/3/5527',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_thermoOccFanMode',
                    getHandler: 'get_thermoOccFanMode',
                    value: "off",
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatUnoccupiedFanMode': function() {
            return {
                deviceJS: {
                    state: 'thermostatUnoccupiedFanMode',
                    event: 'thermostatUnoccupiedFanMode'
                },
                handlers: {
                    put_thermoUnoccFanMode: function(Dev,op,route,value){
                        DBG("Got Facade/ThermostatUnoccupiedFanMode 'put_thermoUnoccFanMode' -> put(",route,value,")")
                        return Dev.set('thermostatUnoccupiedFanMode', value);
                    },
                    get_thermoUnoccFanMode: function(Dev) {
                        DBG("Got Facade/ThermostatUnoccupiedFanMode 'get_thermoUnoccFanMode'")
                        return Dev.get('thermostatUnoccupiedFanMode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatUnoccupiedFanMode changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/4/5527',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_thermoUnoccFanMode',
                    getHandler: 'get_thermoUnoccFanMode',
                    value: "off",
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatModeStatus': function() {
            return {
                deviceJS: {
                    state: 'thermostatModeStatus'
                },
                handlers: {
                    get_thermoModeStatus: function(Dev) {
                        DBG("Got Facade/ThermostatModeStatus 'get_thermoModeStatus'")
                        return Dev.get('thermostatModeStatus')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatModeStatus changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/5/5527',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_thermoModeStatus',
                    value: "OFF",
                    stateSender: 'send'
                }
            }
        },
        'Facades/ThermostatFanStatus': function() {
            return {
                deviceJS: {
                    state: 'thermostatFanStatus'
                },
                handlers: {
                    get_thermoFanStatus: function(Dev) {
                        DBG("Got Facade/ThermostatFanStatus 'get_thermoFanStatus'")
                        return Dev.get('thermostatFanStatus')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> thermostatFanStatus changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3341/6/5527',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_thermoFanStatus',
                    value: "off",
                    stateSender: 'send'
                }
            }
        },
        'Facades/ThermostatGStatus': function() {
            return {
                deviceJS: {
                    state: 'gStatus',
                    event: 'gStatus'
                },
                handlers: {
                    get_gStatus: function(Dev) {
                        DBG("Got Facade/ThermostatGStatus 'get_gStatus'")
                        return Dev.get('gStatus')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> gStatus changed. transforming for mbed. ",path,val)
                        if(val == 'open') {
                            return true;
                        } else return false;
                    }
                },
                oma: {
                    path: '/3200/0/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_gStatus',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatW1Status': function() {
            return {
                deviceJS: {
                    state: 'w1Status',
                    event: 'w1Status'
                },
                handlers: {
                    get_w1Status: function(Dev) {
                        DBG("Got Facade/ThermostatW1Status 'get_w1Status'")
                        return Dev.get('w1Status')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> w1Status changed. transforming for mbed. ",path,val)
                        if(val == 'open') {
                            return true;
                        } else return false;
                    }
                },
                oma: {
                    path: '/3200/1/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_w1Status',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatW2Status': function() {
            return {
                deviceJS: {
                    state: 'w2Status',
                    event: 'w2Status'
                },
                handlers: {
                    get_w2Status: function(Dev) {
                        DBG("Got Facade/ThermostatW2Status 'get_w2Status'")
                        return Dev.get('w2Status')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> w2Status changed. transforming for mbed. ",path,val)
                        if(val == 'open') {
                            return true;
                        } else return false;
                    }
                },
                oma: {
                    path: '/3200/2/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_w2Status',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatY1Status': function() {
            return {
                deviceJS: {
                    state: 'y1Status',
                    event: 'y1Status'
                },
                handlers: {
                    get_y1Status: function(Dev) {
                        DBG("Got Facade/ThermostatY1Status 'get_y1Status'")
                        return Dev.get('y1Status')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> y1Status changed. transforming for mbed. ",path,val)
                        if(val == 'open') {
                            return true;
                        } else return false;
                    }
                },
                oma: {
                    path: '/3200/3/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_y1Status',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/ThermostatY2Status': function() {
            return {
                deviceJS: {
                    state: 'y2Status',
                    event: 'y2Status'
                },
                handlers: {
                    get_y2Status: function(Dev) {
                        DBG("Got Facade/ThermostatY2Status 'get_y2Status'")
                        return Dev.get('y2Status')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> y2Status changed. transforming for mbed. ",path,val)
                        if(val == 'open') {
                            return true;
                        } else return false;
                    }
                },
                oma: {
                    path: '/3200/4/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_y2Status',
                    value: 1,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },
        'Facades/HasLuminance': function() {
            // /3301  "illuminance sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3301
            // /5700  Sensor value
            return {
                deviceJS: {
                    state: 'luminance',
                    event: 'luminance'
                },
                handlers: {
                    get_luminance: function(Dev) {
                        DBG("Got Facade/HasLuminance 'get_luminance'")
                        return Dev.get('luminance')
                    }
                },
                senders: {
                    send: function(path,val) {
                        // just return the value. We don't need to transform this one for luminance.
                        DBG("stateSender -> luminance changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3301/0/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_luminance',
                    value: 1,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                // static oma paths, are value that will never change,
                // so they are just set on registration and done
                static_oma: [
                    {   // min possible value
                        path: '/3301/0/5603',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/3301/0/5604',
                        operation: ['GET'],
                        value: 65535
                    }
                ]
            }
        },
        'Facades/Button': function() {
            // /3347 IPSO "push button"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3347
            // /5850 IPSO "on/off" RW boolean
            return {
                deviceJS: {
                    state: 'pressed'
                },
                // onStateChangeFromMbed: {
                //     put: function(route,value){
                //        DBG("Got Facade/Button onStateChangeFromMbed - put(",arguments,")")                        
                //     },
                //     post: function(route,value){}
                // },
                handlers: {
                    put_pressed: function(Dev,op,route,value){
                        // from:
                        // https://github.com/armPelionEdge/edge-node-modules/blob/master/core-interfaces/facades/button.json
                        // to:
                        // /3347 IPSO "light control"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3347
                        DBG("Got Facade/Button 'put_pressed' -> put(",route,value,")")
                        if(value == '1') {
                                return Dev.set('pressed', true);
                        } else if(value == '0') {
                                return Dev.set('pressed',false);
                        } else return Promise.reject("Facades/Button state pressed: arg must be boolean(0,1)");
                    },
                    get_pressed: function(Dev) {
                        DBG("Got Facade/Button 'get_pressed'")
                        return Dev.get('pressed')
                    },
                    post: function(route,value){}
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> pressed changed. transforming for mbed. ",path,val)
                        if (val) {
                            return 1;
                        } else {
                            return 0;
                        }
                    }
                },
                oma: {
                    path: '/3347/0/5850',
                    handler: 'put_pressed',
                    initSend: true,
                    getHandler: 'get_pressed',
                    stateSender: 'send',
                    operation: ['PUT','GET'],
                    value: 0,
                    type: 'Int'
                }
            }
        },
        'Facades/Switchable': function() {
            // /3311 IPSO "light control"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3311
            // /5850 IPSO "on/off"
            return {
                deviceJS: {
                    state: 'power'
                },
                handlers: {
                    put: function(Dev,op,route,value){
                        DBG("Got Facade/Switchable 'put_power' -> put(",route,value,")")
                        if(value == '1') {
                            return Dev.set('power','on')
                        } else if(value == '0') {
                            return Dev.set('power','off')
                        } else return Promise.reject("Facades/Switchable state power: arg must be boolean(0,1)");
                    },
                    get_power: function(Dev) {
                        DBG("Got Facade/Switchable 'get_power'")
                        return Dev.get('power')
                    }
                },
                senders: {
                    send: function(path,val){
                        DBG("stateSender -> power changed. transforming for mbed. ",path,val)
                        if (val == 'on') {
                            return true;
                        } else {
                            return false;
                        }
                    }
                },
                oma: {
                    path: '/3311/0/5850',
                    operation: ['PUT','GET'],
                    initSend: true,
                    getHandler: 'get_power',
                    handler: 'put',
                    stateSender: 'send',
                    value: false
                }
            }
        },
        'Facades/Dimmable': function() {
            // /3311 IPSO "light control" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3311
            // /5851 Dimmer RW integer 0-100
            return {
                // static information. Which state property and/or events name does this Facade care about
                deviceJS: {
                    state: 'brightness'
//                    ,event: 'someevent'
                },
                // handlers are called when data has changed on the Edge / mbed side
                // and needs to be updated on the deviceJS side
                handlers: {
                    put_dimmer: function(Dev,op,route,value){
                        // from:
                        // https://github.com/armPelionEdge/edge-node-modules/blob/master/core-interfaces/facades/dimmable.json
                        // to:
                        // /3311 IPSO "light control"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3311
                        DBG("Got Facade/Dimmable 'put_dimmer' -> put(",route,value,")")
                        var val = value/100;
                        return Dev.set('brightness',val)
                    },
                    get_dimmer: function(Dev) {
                        DBG("Got Facade/Dimmable 'get_dimmer'")
                        return Dev.get('brightness')
                    },
                    post: function(route,value){}
                },
                // senders are called when data has changed on deviceJS side, and should be transformed
                // for Edge
                senders: {
                    state_set: function(path,val) {
                        DBG("stateSender -> brightness changed. transforming for mbed. ",path,val)
                        // should return the transformed value:
                        return val*100;
                    }
                },
                oma: {
                    path: '/3311/0/5851',
                    handler: 'put_dimmer',      // inbound change from mbed Edge, must reference a function in handlers
                    getHandler: 'get_dimmer',
                    stateSender: 'state_set',   // if the state changes on deviceJS, call sender 'set' and pass in this OMA path
                    initSend: true,             // after first discovering device, send the state to mbed, which effectively replace the 'value' below
                    operation: ['PUT','GET'],
                    value: 0,
                    type: 'Int'
                }
            }
        },

        'Facades/Colorable': function() {
            // /3335 IPSO "color"   
            // /5706 IPSO "dimmer" "A string representing a value in some color space"
            // 
            // This is a user-defined format:
            // deviceJS uses a HSL object, which is {h:0,s:1,l:1} for white and {h:0,s:0,l:0} for black
            // and {h:0,s:1,l:0.5} for red
            // The string we will accept is: "H,S,L" where H,S and L are numbers 0-1. So for red it would be:
            // "0,1,0.5"  
            // 
            return {
               deviceJS: {
                    state: 'hsl'
//                    ,event: 'someevent'
                },
                // handlers are called when data has changed on the Edge / mbed side
                // and needs to be updated on the deviceJS side
                handlers: {

                    put_hsl: function(Dev,op,route,value){

                        DBG("Got Facade/Colorable 'put_hsl' -> put(",route,value,")")
                        if(typeof value == 'string') {
                            var vals = value.split(',')
                            if(vals.length == 3) {
                                var hsl = {
                                    h: parseFloat(vals[0]),
                                    s: parseFloat(vals[1]),
                                    l: parseFloat(vals[2])
                                }
                                if( hsl.h <= 1 && hsl.h >= 0 &&
                                    hsl.s <= 1 && hsl.s >= 0 &&
                                     hsl.l <= 1 && hsl.l >= 0) {
                                    return Dev.set('hsl',hsl)
                                }                                
                            }
                            return Promise.reject('malformed value')
                        } else {
                            return Promise.reject('invalid value')
                        }
                    },
                    get_hsl: function(Dev) { 
                        DBG("Got Facade/Colorable 'get_hsl'")
                        return Dev.get('hsl')
                    },
                    post: function(route,value){}
                },
                // senders are called when data has changed on deviceJS side, and should be transformed
                // for Edge
                senders: {
                    state_set: function(path,val) {
                        DBG("stateSender -> color changed. transforming for mbed. ",path,val)
                        // should return the transformed value:
                        return "" + val.h + "," + val.s + "," + val.l;
                    }
                },

                oma:{
                    path: '/3335/0/5706',
                    operation: ['PUT','GET'],
                    initSend: true,
                    value: "0,0,0",
                    handler: 'put_hsl',
                    getHandler: 'get_hsl',
                    stateSender: 'state_set'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3335/0/5701',
                        operation: ['GET'],
                        value: "0,0,0"            // we will return this as H,S¸L where H S & L are 0-1
                    }
                ]                
            }
        },

        'Facades/HasMotion': function() {
            // /3302 IPSO "presence"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3302
            // /5500 Boolean The current state of digital input - on / off
            return {
                deviceJS: {
                    state: 'motion',
                    event: 'motion'
                },
                handlers: {
                    get_motion: function(Dev) {
                        DBG("Got Facade/HasMotion 'get_motion'")
                        return Dev.get('motion')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> motion changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3302/0/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_motion',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },

        'Facades/HasTamper': function() {
            // /3306 IPSO "Actuation"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3306
            // /0 Will map to tamper
            // /5850 Boolean The current state- on / off
            return {
                deviceJS: {
                    state: 'tamper',
                    event: 'tamper'
                },
                handlers: {
                    get_tamper: function(Dev) {
                        DBG("Got Facade/HasTamper 'get_tamper'")
                        return Dev.get('tamper')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> tamper changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3306/0/5850',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_tamper',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },

        'Facades/Triggerable': function() {
            // /3306 IPSO "Actuation"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3306
            // /1 Will map to triggerable
            // /5850 Boolean The current state- on / off
            return {
                deviceJS: {
                    state: 'triggered'
                },
                handlers: {
                    get_triggerable: function(Dev) {
                        DBG("Got Facade/Triggerable 'get_triggerable'")
                        return Dev.get('triggered')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> triggered changed. transforming for mbed. ",path,val)
                        if(val) {
                            return true;
                        } else return false;
                    }
                },
                oma:{
                    path: '/3306/1/5850',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_triggerable',
                    value: false,
                    stateSender: 'send'
                }
            }
        },

        'Facades/HumidityTrigger': function() {
            // /3306 IPSO "Actuation"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3306
            // /2 Will map to tempTrigger
            // /5850 Boolean The current state- on / off
            return {
                deviceJS: {
                    event: 'humidityTrigger'
                },
                handlers: {
                    put_humTrigger: function(Dev,op,route,value){
                        DBG("Got Facade/HumidityTrigger 'put_humTrigger' -> put(",route,value,")")
                        if(value == '1') {
                            return Dev.set('humidityTrigger','on')
                        } else if(value == '0') {
                            return Dev.set('humidityTrigger','off')
                        }
                    },
                    get_humTrigger: function(Dev) {
                        DBG("Got Facade/HumidityTrigger 'get_humTrigger'")
                        return Dev.get('humidityTrigger')
                    }
                },
                senders: {
                    send: function(path,val){
                        DBG("stateSender -> humidityTrigger changed. transforming for mbed. ",path,val)
                        if (val == 'on') {
                            return true;
                        } else {
                            return false;
                        }
                    }
                },
                oma: {
                    path: '/3306/2/5850',
                    operation: ['PUT'],
                    initSend: true,
                    getHandler: 'get_humTrigger',
                    handler: 'put_humTrigger',
                    stateSender: 'send',
                    eventSender: 'send',
                    value: false
                }
            }
        },

        'Facades/TemperatureTrigger': function() {
            // /3306 IPSO "Actuation"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3306
            // /3 Will map to HumidityTrigger
            // /5850 Boolean The current state- on / off
            return {
                deviceJS: {
                    event: 'temperatureTrigger'
                },
                handlers: {
                    put_tempTrigger: function(Dev,op,route,value){
                        DBG("Got Facade/TemperatureTrigger 'put_tempTrigger' -> put(",route,value,")")
                        if(value == '1') {
                            return Dev.set('temperatureTrigger','on')
                        } else if(value == '0') {
                            return Dev.set('temperatureTrigger','off')
                        }
                    },
                    get_tempTrigger: function(Dev) {
                        DBG("Got Facade/TemperatureTrigger 'get_tempTrigger'")
                        return Dev.get('temperatureTrigger')
                    }
                },
                senders: {
                    send: function(path,val){
                        DBG("stateSender -> temperatureTrigger changed. transforming for mbed. ",path,val)
                        if (val == 'on') {
                            return true;
                        } else {
                            return false;
                        }
                    }
                },
                oma: {
                    path: '/3306/3/5850',
                    operation: ['PUT'],
                    initSend: true,
                    getHandler: 'get_tempTrigger',
                    handler: 'put_tempTrigger',
                    stateSender: 'send',
                    eventSender: 'send',
                    value: false
                }
            }
        },

        'Facades/HasVibration': function() {
            // /3338 IPSO "Buzzer"  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3338
            // /5850 Boolean The current state- on / off
            return {
                deviceJS: {
                    state: 'vibration',
                    event: 'vibration'
                },
                handlers: {
                    get_vibration: function(Dev) {
                        DBG("Got Facade/HasVibration 'get_vibration'")
                        return Dev.get('vibration')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> vibration changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3338/0/5850',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_vibration',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },

        'Facades/HasPassCode': function() {
            // /11001  WigWag "a pass code entry" device
            // /5527   "text"
            return {
                deviceJS: {
                    state: 'passCode'
                },
                handlers: {
                    put_passCode: function(Dev,op,route,value) {
                        DBG("Got Facade/HasPassCode 'put_passCode' -> put(",route,value,")")
                        return Dev.set('passCode', value);
                        if(typeof value == 'string') {
                            var arr = JSON.parse(value);
                            if(Array.isArray(arr)) {
                                return Dev.set('passCode', arr)
                            }
                            return Promise.reject('malformed value')
                        } else {
                            return Promise.reject('invalid value')
                        }
                    },
                    get_passCode: function(Dev) {
                        DBG("Got Facade/HasPassCode 'get_passCode'")
                        return Dev.get('passCode')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> passCode changed. transforming for mbed. ",path,val)
                        return '['+val.toString()+']';
                    }
                },
                oma:{
                    path: '/11001/0/5527',
                    operation: ['PUT'],
                    initSend: true,
                    handler: 'put_passCode',
                    getHandler: 'get_passCode',
                    value: "[0x03,0x01,0x31,0x32,0x33,0x34]",
                    stateSender: 'send'
                }
            }
        },

        'Facades/HasPTZ': function() {
            // /3332 IPSO "Direction" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3332
            // /5702 X-value R float
            return {
                deviceJS: {
                    state: 'ptz'
                },
                handlers: {
                    get_ptz: function(Dev) {
                        DBG("Got Facade/HasPTZ 'get_ptz'")
                        return Dev.get('ptz')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> ptz changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3332/0/5702',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_ptz',
                    value: 1,
                    stateSender: 'send'
                }
            }
        },

        'Facades/HasBattery': function() {
            // /3305 Power Measurement http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3305
            // /5800 R float Instantaneous active power
            return {
                deviceJS: {
                    state: 'battery',
                    event: 'battery'
                },
                handlers: {
                    get_battery: function(Dev) {
                        DBG("Got Facade/HasBattery 'get_battery'")
                        return Dev.get('battery')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> battery changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3305/0/5800',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_battery',
                    value: 0,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3305/0/5803',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/3305/0/5804',
                        operation: ['GET'],
                        value: 100
                    // },
                    // {   // units
                    //     path: '/3305/0/5701',
                    //     operation: ['GET'],
                    //     value: "Per-cent"
                    }
                ]
            }
        },

        'Facades/HasContact': function() {
            // /3345 IPSO Multi-axis position http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3345
            // /5500 Boolean The current state of digital input - on / off
            return {
                deviceJS: {
                    state: 'contact',
                    event: 'contact'
                },
                handlers: {
                    get_contact: function(Dev) {
                        DBG("Got Facade/HasContact 'get_contact'")
                        return Dev.get('contact')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> contact changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3345/0/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_contact',
                    value: false,
                    stateSender:  'send',
                    eventSender: 'send'
                }                
            }
        },


        'Facades/HasEnergyConsumption': function() {
            // /3331 IPSO Energy http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3331
            // /5805 R float Sensor Value
            return {
                deviceJS: {
                    state: 'energy',
                    event: 'energy'
                },
                handlers: {
                    get_energy: function(Dev) {
                        DBG("Got Facade/HasEnergyConsumption 'get_energy'")
                        return Dev.get('energy');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> energy changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3331/0/5805',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_energy',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                // static_oma: [
                //     {   // min possible value
                //         path: '/3304/0/5603',
                //         operation: ['GET'],
                //         value: 0.0
                //     },
                //     {   // max possible value
                //         path: '/3304/0/5604',
                //         operation: ['GET'],
                //         value: 100.0
                //     }
                // ]
            }
        },

        'Facades/Regulator': function() {
            // /3337 Positioner  http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3337
            // /5536 0-100 (float) Current Position
            return {
                deviceJS: {
                    state: 'regulator'
                },
                handlers: {
                    put_regulator: function(Dev,op,route,value) {
                        DBG("Got Facade/Regulator 'put_regulator' -> put(",route,value,")")
                        return Dev.set('regulator', value);
                    },
                    get_regulator: function(Dev) {
                        DBG("Got Facade/Regulator 'get_regulator'")
                        return Dev.get('regulator')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> regulator changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3337/0/5536',
                    operation: ['GET', 'PUT'],
                    initSend: true,
                    handler: 'put_regulator',
                    getHandler: 'get_regulator',
                    value: 1,
                    type: 'Int',
                    stateSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3337/0/5519',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/3337/0/5520',
                        operation: ['GET'],
                        value: 100
                    }
                ]
            }
        },

        'Facades/Flipflop': function() {
            // /3342 On/Off Switch http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3342
            // /5500 Digital Input State R boolean
            return {
                deviceJS: {
                    state: 'flipflop',
                    event: 'flipflop'
                },
                handlers: {
                    get_flipflop: function(Dev) {
                        DBG("Got Facade/Flipflop 'get_flipflop'")
                        return Dev.get('flipflop');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> flipflop changed. transforming for mbed. ",path,val)
                        if(val == 'on') {
                            return true;
                        } else return false;
                    }
                },
                oma:{
                    path: '/3342/0/5500',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_flipflop',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },


        'Facades/HasLock': function() {
            // /8    Lock and Wipes http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/8
            // /5500 DigitalInputState R boolean
            return {
                deviceJS: {
                    state: 'lock',
                    event: 'lock'
                },
                handlers: {
                    put_lock: function(Dev,op,route,value) {
                        DBG("Got Facade/HasLock 'put_lock' -> put(",route,value,")")
                        if(value == '1') {
                            return Dev.set('lock', 'lock');
                        } else if(value == '0') {
                            return Dev.set('lock', 'unlock');
                        } else return Promise.reject("Facades/HasLock state lock: arg must be boolean(0,1)");
                    },
                    get_lock: function(Dev) {
                        DBG("Got Facade/HasLock 'get_lock'")
                        return Dev.get('lock');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> lock changed. transforming for mbed. ",path,val)
                        if(val == 'lock') {
                            return true;
                        } else return false;
                    }
                },
                oma:{
                    path: '/8/0/5500',
                    operation: ['PUT', 'GET'],
                    initSend: true,
                    handler: 'put_lock',
                    getHandler: 'get_lock',
                    value: false,
                    stateSender: 'send',
                    eventSender: 'send'
                }
            }
        },

        'Facades/Humidity': function() {
            // /3304 HumiditySensor http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3304
            // /5700 Sensor Value R float
            return {
                deviceJS: {
                    state: 'humidity',
                    event: 'humidity'
                },
                handlers: {
                    get_humidity: function(Dev) {
                        DBG("Got Facade/Humidity 'get_humidity'")
                        return Dev.get('humidity');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> humidity changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3304/0/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_humidity',
                    value: 1.0,
                    type: 'Float',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3304/0/5603',
                        operation: ['GET'],
                        value: 0.0
                    },
                    {   // max possible value
                        path: '/3304/0/5604',
                        operation: ['GET'],
                        value: 100.0
                    }
                ]
            }
        },

        'Facades/HasSmokeAlarm': function() {
            // /3340 Timer http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3340
            // /5700 Sensor value R float
            return {
                deviceJS: {
                    state: 'smoke',
                    event: 'smoke'
                },
                handlers: {
                    get_smoke: function(Dev) {
                        DBG("Got Facade/HasSmokeAlarm 'get_smoke'")
                        return Dev.get('smoke');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> smoke changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/3340/0/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_smoke',
                    value: 1,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3340/0/5603',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/3340/0/5604',
                        operation: ['GET'],
                        value: 255
                    }
                ]
            }
        },

        'Facades/HasWaterLeakDetector': function() {
            // /10272 Water Meter Customer Leakage
            // /5700  Sensor value
            return {
                deviceJS: {
                    state: 'waterleak',
                    event: 'waterleak'
                },
                handlers: {
                    get_waterleak: function(Dev) {
                        DBG("Got Facade/HasWaterLeakDetector 'get_waterleak'")
                        return Dev.get('waterleak');
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> waterleak changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma:{
                    path: '/10272/0/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_waterleak',
                    value: 1,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/10272/0/5603',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/10272/0/5604',
                        operation: ['GET'],
                        value: 255
                    }
                ]
            }
        },
        'Facades/Ultraviolet': function() {
            // /3300  "Generic sensor" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3300
            // /5700  Sensor value
            return {
                deviceJS: {
                    state: 'ultraviolet',
                    event: 'ultraviolet'
                },
                handlers: {
                    get_ultraviolet: function(Dev) {
                        DBG("Got Facade/Ultraviolet 'get_ultraviolet'")
                        return Dev.get('ultraviolet')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> ultraviolet changed. transforming for mbed. ",path,val,typeof val)
                        return val;
                    }
                },
                oma: {
                    path: '/3300/0/5700',
                    operation: ['GET'],
                    initSend: true,
                    getHandler: 'get_ultraviolet',
                    value: 1,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3300/0/5603',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // max possible value
                        path: '/3300/0/5604',
                        operation: ['GET'],
                        value: 65535
                    }
                ]
            }
        },
        'Facades/Override': function() {
            // /3201  "Digital Output" http://vorto.eclipse.org/resolve/lwm2m/Object/ObjectID/3201
            // /5550  DigitalState RW boolean
            return {
                deviceJS: {
                    state: 'override'
                },
                handlers: {
                    put_override: function(Dev,op,route,value){
                        DBG("Got Facade/Override 'put_override' -> put(",route,value,typeof value,")")
                        return Dev.set('override',value)
                    },
                    get_override: function(Dev) {
                        DBG("Got Facade/Override 'get_override'")
                        return Dev.get('override')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> override changed. transforming for mbed. ",path,val,typeof val)
                        return val
                    }
                },
                oma: {
                    path: '/3201/0/5550',
                    operation: ['PUT','GET'],
                    initSend: true,
                    handler: 'put_override',
                    getHandler: 'get_override',
                    value: false,
                    stateSender: 'send'
                }
            }
        },

        'Facades/SignalStrength': function() {
            // /3370  "ServiceCellStrength" https://devtoolkit.openmobilealliance.org/OEditor/LWMOView?url=http%3A%2F%2Fwww.openmobilealliance.org%2Ftech%2Fprofiles%2Flwm2m%2F3370.xml
            // /6035  rsrp value Integer
            return {
                deviceJS: {
                    state: 'rssi'
                },
                handlers: {
                    get_rssi: function(Dev) {
                        DBG("Got Facade/SignalStrength 'get_rssi'")
                        return Dev.get('rssi')
                    }
                },
                senders: {
                    send: function(path,val) {
                        DBG("stateSender -> rssi changed. transforming for mbed. ",path,val)
                        return val;
                    }
                },
                oma: {
                    path: '/3370/0/6035',
                    operation: ['GET'],
                    initSend:true,
                    getHandler: 'get_rssi',
                    value: 0,
                    type: 'Int',
                    stateSender: 'send',
                    eventSender: 'send'
                },
                static_oma: [
                    {   // min possible value
                        path: '/3370/0/5603',
                        operation: ['GET'],
                        value: -200
                    },
                    {   // max possible value
                        path: '/3370/0/5604',
                        operation: ['GET'],
                        value: 0
                    },
                    {   // units
                        path: '/3370/0/5701',
                        operation: ['GET'],
                        value: "dBm"
                    }
                ]
            }
        },

        'Core/Interfaces/FirmwareUpdate': function() {
            return {
                deviceJS: {

                },
                handlers: {
                    firmwareUpdate: function(Dev,op,route,value){
                        DBG("Got Core/Interfaces/FirmwareUpdate 'program' command -> put(",route,typeof value,")")
                        return new Promise(function(resolve,reject) {
                            if(value.indexOf('http') > -1) {
                                DBG('Found url, executing wget on ' + value);
                                wget(value, function(err, resp, body) {
                                    if(err || body.indexOf('404 Not Found') > -1) {
                                        reject("url not found")
                                    } else if(body){
                                        var str = body.toString();
                                        var lines = str.split('\n');
                                        if(lines[lines.length -1].length == 0) lines.splice(lines.length - 1, 1);
                                        Dev.call('program',lines).then(function(res) {
                                            resolve(res)
                                        }, function(rej) {
                                            reject(rej)
                                        })
                                    }
                                });
                            } else {
                                reject("not a url")
                            }
                        })
                    }
                },
                oma: {
                    path: '/3341/7/5527',
                    operation: ['PUT'],
                    initSend: false,
                    handler: 'firmwareUpdate',
                    value: "enterImageURL"
                }
            }
        }
    },

    // should be used only in rare cases
    byDeviceType: {

    },

    // should not be used except for work arounds
    byDeviceId: {

    }    

};
