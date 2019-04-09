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

var funcs = require('devjs-configurator/common-funcs.js');
var fs = require('fs')
var util = require('util')

var conffilename = process.argv[2]

var s = fs.readFileSync(conffilename);

if (s) {
    funcs.minifyJSONParse(s,function(err,d){
        if (err) {
            console.error("Failed to parse JSON:",err)
            process.exit(1)
        } else {
            console.log("%s",JSON.stringify(d))            
            process.exit(0)
        }

    })
} else {
    console.error("Failed to read file")
    process.exit(1);
}



