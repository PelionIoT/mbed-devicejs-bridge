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

module.exports = {
    "debug" : true,
    "mapUnplacedDevices": true,  // default is true
    //"localEdgePort": 9100,
    "edgeHttpPort": 9101,
    "socket_path": "/tmp/edge.sock",
    "pt_api_path": "/1/pt",
    "mgmt_api_path": "/1/mgmt",
    "relayID": "OVERRIDE_ME",     // should always be overridden by the config
//    "mbedAPIKey" :"OVERRIDE_ME",// needed for portion of the software talking 
                                  // direct to the mbed Cloud
                                  
    /**
     * This string is the selection we will use for looking for new devices.
     * It is used as such:
     * 
     *   dev$.select(<<selectionForDiscovery>>).discover()
     *   
     * The default of id=* looks for any new device. Using a more specific
     * selection string will make the bridge publish more specific devices.
     */
    "selectionForDiscovery": "id=*",

    /**
     * This string is a prefix, placed on all endpoint names which are published
     * to mbed. The idea is to make it perfectly clear that these devices are 
     * gateway connected devices.
     *
     * The {{GATEWAY_ID}} meta variable is replaced with unique ID of the gateway.
     *
     * The "Endpoint Name" can be seen in the mbed portal, on the "Details" tab.
     * 
     */
    "mbedEndpointDeviceTemplate": "gw-{{RELAY_ID}}-{{DEVJS_ID}}",

    /**
     * We don't want to publish deviceJS pseudo-devices, of which there are 
     * a plenty.
     *
     * There are two ways we can do this, either 'whiteListOnly' which will only
     * publish devices listed by their deviceID in the 'whiteList' array, or ignore 
     * specific devices.
     *
     * The white list method is non-ideal, b/c it will not dynamically publish newly 
     * seen devices to mbed Cloud.
     *
     * Here is the way to find the pseudo-devices. Use deviceJS shell, to list all devices
     * on a soft-relay or hardware gateway, with no other devices attached:
     *
     * devicejs> dev$.select('id=*').listResources()
    { DevStateManager: { type: 'DevStateManager', registered: true, reachable: true },
      Scheduler: 
       { type: 'SchedulerEngine/SchedulerManager',
         registered: true,
         reachable: true },
      'WigWag/MobileUI': { type: 'WigWag/MobileUI', registered: true, reachable: true },
      'WigWag/AppServer': { type: 'AppServer', registered: true, reachable: true },
      'TILE-DEVICE': { type: 'RuleUI/TileDevice', registered: true, reachable: true },
      VirtualDeviceDriver: 
       { type: 'VirtualDeviceDriver',
         registered: true,
         reachable: true } }

     * 
     */
     whiteListOnly: false,
     whiteListById: [],

     mappingRules: "default-mapping",

    // these devices are typically internal to deviceJS or a standard module, which creates a 
    // pseudo-device for control of some subsystem.
    "ignoreDevicesById" : [
        "DevStateManager",
        "Scheduler",
        "BacnetDriver",
        "WigWag/MobileUI",
        "WigWag/AppServer",
        "TILE-DEVICE",
        "VirtualDeviceDriver",
        "RUNNER",
        "RelayStats",
        "WigWag/DevicePairer",
        "SixlbrMonitor1"
    ],    // list of any deviceIDs not to map

    // edge core can take up to 30 seconds to start listening to localhost
    spawnEdgePause: 30000
}
