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

# Check for payload format option (default is uuencode).
uuencode=1
if [[ "$1" == '--binary' ]]; then
    binary=1
    uuencode=0
    shift
fi
if [[ "$1" == '--uuencode' ]]; then
    binary=0
    uuencode=1
    shift
fi

if [[ ! "$3" ]]; then
    echo "Usage: $0 [--binary | --uuencode] PAYLOAD_FILE FINAL_FILE INIT_SHELL_SCRIPT"
    exit 1
fi


if [[ $binary -ne 0 ]]; then
    # Append binary data.
    sed \
	-e 's/uuencode=./uuencode=0/' \
	-e 's/binary=./binary=1/' \
	$3 >$2
    echo "BSDTAR:" >> $2
    
    cat $1 >>$2
    echo "" >> $2
fi
if [[ $uuencode -ne 0 ]]; then
    # Append uuencoded data.
    sed \
	-e 's/uuencode=./uuencode=1/' \
	-e 's/binary=./binary=0/' \
	$3 >$2
    echo "BSDTAR:" >> $2

    cat $1 | uuencode - >>$2
    echo "" >> $2
fi
