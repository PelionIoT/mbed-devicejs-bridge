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
 * @module mbed-bridge-events
 */
const util = require('util');
const emitter = require('events');

var _debugOn = false;

class MbedBridgeEvents extends emitter {
    
    emit(){
        if(_debugOn) {
            log.debug("mbed-bridge-events:",util.inspect(arguments))
        }
        super.emit.apply(this,arguments)
    }

    enableDebug(){
        _debugOn = true;
    }
}

const bridgeEvents = new MbedBridgeEvents();

// myEmitter.on('event', () => {
//   console.log('an event occurred!');
// });
// myEmitter.emit('event');

module.exports = {
    events: function() {
        bridgeEvents.enableDebug()
        return bridgeEvents
    },
    EVENT_NEW_MBED_API_KEY: "EVENT_NEW_MBED_API_KEY"
}