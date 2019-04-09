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

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a s    ymlink
    SELF="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
    SOURCE="$(readlink "$SOURCE")"
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative s    ymlink, we need to resolve it relative to the path where the symlink file wa    s located
done

SELF="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

if [ ! -d "$SELF/../../edge-core" ]; then
    echo "ERROR: Can't find edge-core folder. Not at $SELF/../../edge-core"
    exit 1
fi

EDGESRC="$SELF/../../edge-core"

if [ ! -e "$EDGESRC/build/mcc-linux-x86/mbed_edge_config.h" ]; then
    echo "ERROR: can't find mbed_edge_config.h ($EDGESRC/build/mcc-linux-x86/mbed_edge_config.h)"
    exit 1
fi

if [ ! -e "/userdata/mbed/mbed_cloud_dev_credentials.c" ]; then
    echo "ERROR: can't find /userdata/mbed/mbed_cloud_dev_credentials.c  Please copy your credentials file there first."
    exit 1
else
    echo "Found /userdata/mbed/mbed_cloud_dev_credentials.c"
    cp /userdata/mbed/mbed_cloud_dev_credentials.c "$EDGESRC/edge-client"
fi

if grep -qx "#define DEVELOPER_MODE 1" "$EDGESRC/build/mcc-linux-x86/mbed_edge_config.h"
then
    echo "mbed_edge_config.h has DEVELOPER_MODE defined already."
else
    echo "Modifying mbed_edge_config.h"
    echo -e "#define DEVELOPER_MODE 1\n$(cat $EDGESRC/build/mcc-linux-x86/mbed_edge_config.h)" > "$EDGESRC/build/mcc-linux-x86/mbed_edge_config.h"
fi

cd "$SELF/../../edge-core"

# removes old CMake files. These may have been built with cross-compiler
# and if so this cache will break the build if running here with native cc
find . -type d -name CMakeFiles -exec rm -rf {} \;
rm -f /wigwag/mbed/edge-core/build/mcc-linux-x86/CMakeCache.txt
rm -f /wigwag/mbed/edge-core/build/mcc-linux-x86/existing/bin/edge-core
#./build_mbed_edge.sh --clean
./build_mbed_edge.sh

if [ ! -e "/wigwag/mbed/edge-core/build/mcc-linux-x86/existing/bin/edge-core" ]; then
    echo "ERROR: edge-core failed to rebuild."
else
    echo "syncing disk..."
    sync
    echo "Rebuild complete."
fi


