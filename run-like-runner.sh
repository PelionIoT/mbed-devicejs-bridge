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


SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a s    ymlink
    SELF="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done

CWD=`pwd`

SELF="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# to find out existing vars, do this:
# cat /proc/929/environ | tr \\0 \\n
# where 929 is your PID

# existing processes from runner:
# CONSOLE=/dev/tty0
# SHELL=/bin/sh
# TERM=linux
# INIT_VERSION=sysvinit-2.88
# PATH=/sbin:/usr/sbin:/bin:/usr/bin
# runlevel=5
# RUNLEVEL=5
# PWD=/wigwag/devicejs-core-modules/Runner
# VERBOSE=no
# NODE_PATH=/wigwag/devicejs-core-modules/node_modules:./../../devicejs-core-modules/node_modules
# previous=N
# PREVLEVEL=N
# HOME=/
# SHLVL=4
# _=/usr/bin/node
# DEVJS_ROOT=/wigwag/devicejs-ng
# DEVJS_LOGGER={"type":"global","sinkaddress":"/tmp/grease.socket","config":"./relay_logger.conf.json","modulepath":"/wigwag/devicejs-core-modules/Runner/globallogger"}
# DEVJS_CONFIG_FILE=/wigwag/etc/devicejs/devicejs.conf
# GLIBCPP_FORCE_NEW=1
# GLIBCXX_FORCE_NEW=1
# DEVJS_MODULE_CONFIG={"modules":[{"path":"./../ModbusRTU","config":{"serialInterfaceOptions":{"siodev":"/dev/wwUSBP1_TTY","baudrate":19200,"dataBits":8,"stopBits":1,"parity":"none","endPacketTimeout":15},"logLevel":1,"relayId":"WWRL000011","platform":"wwrelay_v0.1.1","maxTransportRetries":1,"requestAckTimeout":100,"throttleRate":50,"modbusResourceId":"ModbusDriver","supportedResourceTypesDirectory":"controllers/supportedResourceTypes","runtimeResourceTypesDirectory":"controllers/runtimeResourceTypes","simulate":false,"schedulerIntervalResolution":500},"_devjsModName":"ModbusRTU"}]}
# DEVJS_PGROUP_NAME=user
# NODE_CHANNEL_FD=3

OLD_DIR=`pwd`

export DEVJS_LOGGER="{\"type\":\"global\",\"sinkaddress\":\"/tmp/grease.socket\",\"config\":\"./relay_logger.conf.json\",\"modulepath\":\"/wigwag/devicejs-core-modules/Runner/globallogger\"}"

FROM_CONFIG_FILE=`node process_test_config.js $SELF/config.json`

DEVJS_MODULE_CONFIG="{\"modules\":[\
{\"path\":\"/wigwag/mbed/mbed-devicejs-bridge\",\"config\":$FROM_CONFIG_FILE}\
]}"
export DEVJS_PGROUP_NAME="mbedbridge"

echo "Will be sent to start-modules:"
echo "------------"
echo DEVJS_MODULE_CONFIG=$DEVJS_MODULE_CONFIG
echo DEVJS_LOGGER=$DEVJS_LOGGER
echo "------------"
# maestro normally sends a message via STDIN

cd /wigwag/devicejs-core-modules/Runner
export DEVJS_ROOT=/wigwag/devicejs-ng
export DEVJS_CONFIG_FILE="/wigwag/etc/devicejs/devicejs.conf"
export DEVJS_MODULE_CONFIG=${DEVJS_MODULE_CONFIG}
NODE_PATH=/wigwag/devicejs-core-modules/node_modules  node /wigwag/devicejs-core-modules/Runner/start-modules "container=mbedbridge"
cd $OLD_DIR
