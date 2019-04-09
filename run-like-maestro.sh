#!/bin/bash

# Copyright (c) 2018, Arm Limited and affiliates.
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This script simulates what maestro would normally do
# to start the project

MAESTRO_SOCKET_PATH="/tmp/maestroapi.sock"

CONFIG="{\"process_config\":{\"debug\":true},\
\"maestro_user_socket_path\":\"$MAESTRO_SOCKET_PATH\",\
\"moduleconfigs\":{\
\"test-module\":{\
\"job\":\"test-module\",\
\"exec_cmd\":\"`pwd`\",\
\"config\":\"{\\\"specialsauce\\\":\\\"secret\\\"}\"\
}}}"


# these env vars are normally setup by maestro as it starts
# the deviceJS process
export DEVJS_ROOT=/wigwag/devicejs-ng
export DEVJS_CONFIG_FILE=/wigwag/etc/devicejs/devicejs.conf
export GREASE_ORIGIN_ID="2001"
export DEBUG_MAESTRO_RUNNER="1"

echo "Will be sent to maestroRunner:"
echo "------------"
echo $CONFIG
echo "------------"
# maestro normally sends a message via STDIN
echo $CONFIG |  node /wigwag/devicejs-core-modules/maestroRunner ./index.js

    