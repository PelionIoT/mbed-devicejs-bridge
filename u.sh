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
    [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done

CWD=`pwd`

SELF="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# this script is for upgrading RP100 systems during the pre-Alpha and Alpha phases only
# or for other development uses only.

uuencode=0
binary=1

BSDTAR_SIZE="2357276"

function separate_bsdtar() {
    match=$(grep --text --line-number '^BSDTAR:$' $SELF/$0 | cut -d ':' -f 1)
 #   matchb=$(grep --text --line-number '^PAYLOAD:$' $SELF/$0 | cut -d ':' -f 1)
    payload_start=$((match + 1))
#    payload_end=$((matchb - match))
#    echo "payload_end: $payload_end"
    # if [[ $binary -ne 0 ]]; then
    #     # add the -t to tar if testing
    #     tail -n +$payload_start $SELF/$0 | tail -n $payload_end > bsdtar
    #     if [ $? -eq 0 ]
    #     then
    #     echo "Separated extractor"
    #     else
    #     cd $CWD
    #     # rm -rf $TEMPDIR
    #     # rm -f $SELF/$0      
    #     echo "ERROR: Failed to separate extractor."
    #     exit 1      
    #     fi
    # fi
    # if [[ $uuencode -ne 0 ]]; then
        tail -n +$payload_start $SELF/$0 | head -c $BSDTAR_SIZE > bsdtar
        if [ $? -eq 0 ]
        then
        echo "Separated extrator"
        chmod a+x bsdtar
        else
        cd $CWD
        # rm -rf $TEMPDIR
        # rm -f $SELF/$0      
        echo "ERROR: Failed to separate extractor."
        exit 1      
        fi
    # fi

}


function untar_payload()
{
    match=$(grep --text --line-number '^PAYLOAD:$' $SELF/$0 | cut -d ':' -f 1)
    payload_start=$((match + 1))
    if [[ $binary -ne 0 ]]; then
        # add the -t to tar if testing
#        tail -n +$payload_start $SELF/$0 | tar -jxf -  --checkpoint=1000 --checkpoint-action=echo="#%u: %T"
        tail -n +$payload_start $SELF/$0 | ./bsdtar -xjf -
        if [ $? -eq 0 ]
        then
        echo "Successfully expanded."
        else
        cd $CWD
        rm -rf $TEMPDIR
        rm -f $SELF/$0      
        echo "ERROR: Failed to expand the archive."
        exit 1      
        fi
    fi
    if [[ $uuencode -ne 0 ]]; then
        tail -n +$payload_start $SELF/$0 | uudecode | ./bsdtar -xjf
        if [ $? -eq 0 ]
        then
        echo "Successfully expanded."
        else
        cd $CWD        
        rm -rf $TEMPDIR
        rm -f $SELF/$0      
        echo "ERROR: Failed to expand the archive."
        exit 1      
        fi
    fi
}

TEMPDIR=`mktemp -d -p /wigwag`

cd $TEMPDIR

echo "Separating extractor..."
separate_bsdtar
#read -p "Install files? " ans
#if [[ "${ans:0:1}"  ||  "${ans:0:1}" ]]; then
echo "Untarring... may take a few minutes. ($TEMPDIR)"
untar_payload
	# Do remainder of install steps.
#fi

# test...
#exit 0 


if [ ! -d "$TEMPDIR/mbed" ]; then
    echo "Failed to decompress upgrade."
    exit 1
fi

echo "Upgrading mbed-devicejs-bridge to latest."

if [ -d "/wigwag/mbed.old" ]; then
    echo "Removing an old mbed-bridge backup"
    rm -rf /wigwag/mbed.old
fi

if [ -d "/wigwag/mbed" ]; then
    echo "Saving old mbed folder"
    mv /wigwag/mbed /wigwag/mbed.old
else
    echo "No existing mbed folder. ok."
fi

echo "Moving upgrade to /wigwag/mbed..."
mv "$TEMPDIR/mbed" /wigwag
cd /wigwag/mbed

if [ -e "/home/wigwaguser/mbed_cloud_dev_credentials.c" ]; then
    echo "Found a mbed_cloud_dev_credentials.c in /home/wigwaguser - using this."
    cp /home/wigwaguser/mbed_cloud_dev_credentials.c /wigwag/mbed/mbed-cloud-edge-confidential-w/edge-client
else
    echo "Did not find a mbed_cloud_dev_credentials.c in /home/wigwaguser..."
    if [ -e "/wigwag/mbed.old/mbed_cloud_dev_credentials.c" ]; then
	echo "Found a mbed_cloud_dev_credentials.c in old bridge install. using this..."	
	cp /wigwag/mbed.old/mbed-cloud-edge-confidential-w/mbed_cloud_dev_credentials.c /wigwag/mbed/mbed-cloud-edge-confidential-w/edge-client
    else
	echo "NOTE: did not find a mbed_cloud_dev_credentials.c file. mbed edge-core may need to built separately."	
    fi
fi

cd /wigwag/mbed/mbed-cloud-edge-confidential-w
echo "Building mbed edge-core daemon..."
./build_mbed_edge.sh

cd /wigwag/mbed

# this only works on RP100 
RELAY_ID=`eetool get relayID`
echo "Your RP100 is ID: $RELAY_ID"

cp /wigwag/mbed/mbed-devicejs-bridge/config.json /wigwag/mbed/mbed-devicejs-bridge/config.json.old

# config file for mbed-devicejs-bridge
cat > /wigwag/mbed/mbed-devicejs-bridge/config.json <<EOF 
{
    "debug": true,
//    "useDefaults": true,         // default is true
    "mapUnplacedDevices": true,  // default is true
    "ignoreDevicesById" : [],    // list of any deviceIDs not to map
    "relayID": "$RELAY_ID",     // This is the Relay ID. This should be populated by 
                                 // maestro using the meta variable: {{ARCH_relayID}}
    "mbedAPIKey": "ak_1MDE1ZDUwYTFmYmM2MDI0MjBhMDExMTA5MDAwMDAwMDA015e967fe74802420a01390300000000aJOhYRqzTXINzN9Aw2OkV5WrG0YwgmKS",
    "spawnEdgeCore": false,
    // If true, then we must provide a path to edge-core, with needed options
    // Note: this is not a final production method. In production, edge-core will be started by Maestro
    "edgeExecCmd": ["/wigwag/mbed/mbed-cloud-edge-confidential-w/build/mcc-linux-x86/existing/bin/edge-core","9100","9101"]
}
EOF


# add start script for edge-core

cat > /etc/init.d/edge-core <<EOF2
#!/bin/bash
# /etc/init.d/devicejs: starts Arm edge-core

### BEGIN INIT INFO
# Provides:             edge-core
# Required-Start:       $remote_fs $time wwrelay
# Required-Stop:        $remote_fs $time
# Should-Start:         $network
# Should-Stop:          $network
# Default-Start:        5
# Default-Stop:         0 1 6
# Short-Description:    System logger
### END INIT INFO


start_edge() {
   /wigwag/mbed/mbed-cloud-edge-confidential-w/build/mcc-linux-x86/existing/bin/edge-core 9100 9101 > /var/log/edge-core 2>&1 &
}

 case "\$1" in
     start)
         echo "Starting mbed edge-core"
         start_edge
         ;;
     #                                                                                                                                                                  
     stop)
         echo "Stopping edge-core"
         killall edge-core
         ;;
     restart)
         echo "Restarting edge-core"
         ;;
     *)
         echo "Usage: \$0 {start|stop|restart}"
         exit 1
 esac

 exit 0


EOF2

chmod a+x /etc/init.d/edge-core
update-rc.d edge-core defaults 95 5
# update /wigwag/wwrelay-utils/conf/template.config.json with an updated version
# which starts the bridge

if [ ! -e "/wigwag/devicejs-core-modules/Runner/template.config.json.orig" ]; then
    echo "Backed up original template config as: /wigwag/devicejs-core-modules/Runner/template.config.json.orig"
    cp /wigwag/devicejs-core-modules/Runner/template.config.json /wigwag/devicejs-core-modules/Runner/template.config.json.orig
fi

# fill in any $-style vars which normally would be filled in by Runner (so the don't expand to nothing)
thisdir="/wigwag/devicejs-core-modules/Runner"
NODE_PATH="/wigwag/devicejs-core-modules/node_modules:/wigwag/devicejs-ng/node_modules"

cat > /wigwag/devicejs-core-modules/Runner/template.config.json <<EOF3
{
    "logger":{
        "type":"global",
        "sinkaddress":"/tmp/grease.socket",
        "config":"${thisdir}/relay_logger.conf.json"
    },
    "container_templates":{
        "example_container":{
            "capabilities":{
                "NET_BIND_SERVICE":"permitted"
            },
            "cgroup_limits":{

            },
            "chroot_prefix":"/tmp/devjs_container"
        }
    },
    "deviceJSConfig":"{{devicejsConfFile}}",
    "defaults":{
        "default_user":"*",        // means whoever runs it
        "default_group":"*"        // means whatever group runs it
    },
    "HOOK":{
        "LEDController":{
            "startWithRunner":true,
            "config":{
                "ledBrightness":5,
                "ledColorProfile":"{{ledconfig}}",
                "ledDriverSocketPath": "/var/deviceOSkeepalive"
            }
        }
    },
    "process_groups":{
        "core":{
            "limits":{
                "cgroup_limits":{

                },
                "capabilties":{

                }
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1",
                "--nouse-idle-notification"
            ],
            "restart":{
                "limit":5000,
                "timeout":90000
            },
            "modules":{

            },
            "deviceJSCore":{
                "root":"/wigwag/devicejs-ng",
                "opts":[

                ],
                "execWaitTimeMS":30000                // I need this to wait this long for now
            }
        },
        "db":{
            "restart":{
                "limit":5000,
                "timeout":2000
            },
            "enable":false,
            "execPath":"/usr/bin/devicedb",
            "configFile":"{{devicedbConfFile}}"
        },
        "all-modules":{
            "limits":{
                "limit_group":""                // cgroup limits here - TBD
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{ // not required,but options are:
                "timeout":90000, // the timeout between restarts will still take affect
                "limit":5000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../node_modules:/wigwag/devicejs-core-modules/IPStack/node_modules"
            },
            "modules":[
                {
                    "path":"${thisdir}/../wigwag-devices",
                    "config":{
                        "cloudURL":"{{cloudurl}}",
                        "ssl":{
                            "key":"{{sslCertsPath}}/client.key.pem",
                            "cert":"{{sslCertsPath}}/client.cert.pem",
                            "ca":[
                                "{{sslCertsPath}}/ca.cert.pem",
                                "{{sslCertsPath}}/intermediate.cert.pem"
                            ]
                        },
                        "apiKey":"{{apikey}}",
                        "udpSourcePort":3000,
                        "udpDestinationPort":3001,
                        "platform":"{{wwplatform}}",
                        "sixlbr":{
                            "ifname":"Witap0",
                            "wsnNet":"bbbb::100",
                            "sixlbr":{
                                "tundev":"Witap0",
                                "use_raw_ethernet":false,
                                "log_level":[
                                    "error"
                                ],
                                "platform":"{{wwplatform}}",
                                "siodev":"tty6lbr",
                                "siodev_secondary":"ttyUSB1",
                                "sixBMAC":"{{sixbmac}}",
                                "baudrate":115200,
                                "slip_delay":0,
                                "watchdog_interval": 0,
                                "ww_encryption":true,
                                "firmware_path_mc1322":"/home/wigwag/workspace/devicejs/core/",
                                "firmware_file_prefix":"slip-radio_econotag",
                                "reset_GPIO_path_firmware_mc1322":"/sys/class/gpio/gpio105/value",
                                "erase_GPIO_path_firmware_mc1322":"/sys/class/gpio/gpio103/value",
                                "reset_GPIO_path_firmware_cc2530":"{{sixlbrreset}}",
                                "relay_version":7,
                                "nvm_data":{
                                    "channel":20,
                                    "rpl_dio_intdoubl":1,
                                    "rpl_dio_intmin":12,
                                    "rpl_default_lifetime":4,
                                    "rpl_lifetime_unit":100,
                                    "rpl_version_id":247
                                }
                            }
                        }
                    }
                }, 
                // {
                //     "path":"${thisdir}/../core-lighting",
                //     "config":{

                //     }
                // },
                // {
                //     "path":"${thisdir}/../sonos",
                //     "config":{

                //     }
                // },
                {
                    "path":"${thisdir}/../core-interfaces",
                    "config":{

                    }
                },
                {
                    "path":"${thisdir}/../ww-zwave",
                    "config":{
                        "serialInterfaceOptions":{
                            "siodev":"/dev/ttyZwave",
                            "baudrate":115200,
                            "dataBits":8,
                            "stopBits":1
                        },
                        "platform":"{{wwplatform}}"
                    }
                },
                {
                    "path":"${thisdir}/../Enocean",
                    "config":{
                        "serialInterfaceOptions": { 
                            "siodev": "/dev/ttyEnocean",
                            "baudrate": 57600,
                            "dataBits": 8,
                            "stopBits": 1,
                            "parity": "none"
                        },
                        "logLevel": 2, //Available- info- 2, debug- 3, trace- 4, error- 0, warn- 1
                        "relayId": "{{apikey}}",
                        "platform": "{{wwplatform}}", //Used to identify platform so that module can adapt and run automagically
                        "server-eep": "a5-38-08", //Representing as Central Command Gateway
                        "requestAckTimeout": 500, //Timeout if no data received on request (in ms)
                        "supportedEEPDirectory": "controllers/supportedEEPControllers", //Relative path to directory where all the resouce recipes are or will be defined,
                        "resourceTypePrefix": "Core/Devices/Enocean"
                    }
                },
                {
                    "path":"${thisdir}/../IPStack",
                    "config":{
                        "wan":[
                            "eth0",
                            "eth1",
                            "wlan0"
                        ],
                        "dhcp":"on",
                        "static":{
                            "ipaddress":"10.10.20.31",
                            "mask":"255.255.255.0",
                            "gateway":"10.10.20.1"
                        },
                        "ethernetMAC":"{{ethernetmac}}"
                    }
                },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/MDNS",
                //     "config":{
                //         "id":"{{apikey}}",
                //         "waitForIPStack":true,
                //         "port":443
                //     }
                // },
                {
                    "path":"${thisdir}/../../wigwag-core-modules/VirtualDeviceDriver",
                    "config": {
                        "deviceControllersDirectory": "templates",
                        "hideTemplates": [ "VideoCamera" ],
                        "logLevel": 1
                    }
                }
            ]
        },
        "mbed-bridge":{
            "limits":{
                "limit_group":""                // cgroup limits here - TBD
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{ // not required,but options are:
                "timeout":15000, // the timeout between restarts will still take affect
                "limit":5000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../node_modules:/wigwag/mbed/mbed-devicejs-bridge/node_modules"
            },
            "modules":[
                {
                    "path":"/wigwag/mbed/mbed-devicejs-bridge",
                    "config":{
                        "debug": true,
                        //    "useDefaults": true,         // default is true
                        "mapUnplacedDevices": true,  // default is true
                        "ignoreDevicesById" : [],    // list of any deviceIDs not to map
                        "relayID": "$RELAY_ID",     // This is the Relay ID. This should be populated by 
                        // maestro using the meta variable: {{ARCH_relayID}}
                        "mbedAPIKey": "ak_1MDE1ZDUwYTFmYmM2MDI0MjBhMDExMTA5MDAwMDAwMDA015e967fe74802420a01390300000000aJOhYRqzTXINzN9Aw2OkV5WrG0YwgmKS",
                        "spawnEdgeCore": false,
                        // If true, then we must provide a path to edge-core, with needed options
                        // Note: this is not a final production method. In production, edge-core will be started by Maestro
                        "edgeExecCmd": ["/wigwag/mbed/mbed-cloud-edge-confidential-w/build/mcc-linux-x86/existing/bin/edge-core","9100","9101"]
                    }           
                }
            ]
        },
        "zigbee":{
            "limits":{
                "limit_group":""                // cgroup limits here - TBD
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{ // not required,but options are:
                "timeout":90000, // the timeout between restarts will still take affect
                "limit":5000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../node_modules"
            },
            "modules":[
                {
                    "path":"${thisdir}/../zigbeeHA",
                    "config":{
                        "siodev":"/dev/ttyZigbee",
                        "devType":0,
                        "newNwk":false,
                        "channelMask":25,
                        "baudRate":115200,
                        "log_level":1,
                        "networkRefreshDuration":17000,
                        "panIdSelection":"randomInRange",
                        "panId":23,
                        "platform":"{{wwplatform}}",
                        "logLevel": 2 //Available- info- 2, debug- 3, trace- 4, error- 0, warn- 1
                    }
                }
            ]
        },
        "modbus":{
            "limits":{
                "limit_group":""                // cgroup limits here - TBD
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{ // not required,but options are:
                "timeout":90000, // the timeout between restarts will still take affect
                "limit":5000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../node_modules"
            },
            "modules":[
                {
                    "path":"${thisdir}/../ModbusRTU",
                    "config":{
                        "serialInterfaceOptions":{ //Serial communication setup parameters
                            "siodev":"/dev/ttymodbus",
                            "baudrate":19200,
                            "dataBits":8,
                            "stopBits":1,
                            "parity":"none",
                            "endPacketTimeout":25
                        },
                        "logLevel":1,   //Available- info- 2,debug- 3,trace- 4,error- 0,warn- 1
                        "relayId": "{{apikey}}",
                        "platform":"{{wwplatform}}",    //Used to identify platform so that module can adapt and run automagically
                        "maxTransportRetries":1, //Transport layer retries, message retries are default to 3 so total retries will be 4
                        "requestAckTimeout":100,  //Timeout if no data received on request (in ms)
                        "throttleRate": 50,
                        "modbusResourceId":"ModbusDriver", //ID on which the Modbus module will be registered with DeviceJS
                        "supportedResourceTypesDirectory":"controllers/supportedResourceTypes", //Directory where all the resouces are or will be defined,
                        "runtimeResourceTypesDirectory":"controllers/runtimeResourceTypes",
                        "simulate":false, //Should be false in production, if true it will run even if there is no terminal connected
                        "schedulerIntervalResolution":500    //in ms, interval in which it will check if a resource command needs to be polled. Minimum 500ms.
                                                            //Define polling interval of device controller at this resolution
                    }
                }
            ]
        },
        "bacnet":{
            "limits":{
                "limit_group":""                // cgroup limits here - TBD
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{ // not required,but options are:
                "timeout":90000, // the timeout between restarts will still take affect
                "limit":5000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../node_modules"
            },
            "modules":[
                {
                    "path":"${thisdir}/../BACnet",
                    "config":{
                        "serialInterfaceOptions": { //Used to setup comms with BACnet device
                            "siodev": "/dev/ttybacnet",
                            "baudrate": 76800,
                            "dataBits": 8,
                            "parity": "none",
                            "stopBits": 1
                        },
                        "socketInterfaceOptions": {
                            "sockPort": 7871,
                            "sockAddr": "127.0.0.1",
                            "lib": "/wigwag/system",
                            "program": "bin",
                            "exe": "bacportal"
                        },
                        "macAddr": 126,
                        "activityLength": 100,
                        "logLevel": 1, //Available- info- 2, debug- 3, trace- 4, error- 0, warn- 1
                        "nativeLogLevel": "WARN", //FATAL : 0, ERROR : 10, WARN : 20, ROUTING : 30, INFO : 40, DEBUG : 50, PACKET : 60, DUMP : 70, TRACE : 80, ALL :127
                        "relayId": "{{apikey}}",
                        "platform": "{{wwplatform}}", //Used to identify platform so that module can adapt and run automagically
                        "requestAckTimeout": 300, //ms
                        "throttleRate": 50, //ms
                        "bacnetResourceId": "BacnetDriver",
                        "stateManagerIntervalResolution":12000,
                        "supportedRecipesDirectory": "controllers/supportedResourceRecipes" //Relative path to directory where all the resouce recipes are or will be defined,
                    }
                }
            ]
        },
        "user":{
            "limits":{
                "limit_group":""
            },
            "node_args":[
                // "--max-executable-size=96",
                "--max-old-space-size=128",
                "--max-semi-space-size=1"
            ],
            "restart":{
                "limit":5000,
                "timeout":90000
            },
            "env":{
                "NODE_PATH":"${NODE_PATH}:${thisdir}/../../devicejs-core-modules/node_modules"
            },
            "modules":[
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/RuleEngine",
                //     "config":{
                //         "cloudAddress":"{{cloudurl}}",
                //         "relayID":"{{apikey}}",
                //         "ssl":{
                //             "key":"{{sslCertsPath}}/client.key.pem",
                //             "cert":"{{sslCertsPath}}/client.cert.pem",
                //             "ca":[
                //                 "{{sslCertsPath}}/ca.cert.pem",
                //                 "{{sslCertsPath}}/intermediate.cert.pem"
                //             ]
                //         }
                //     }
                // },
                {
                    "path":"${thisdir}/../../wigwag-core-modules/RelayStatsSender",
                    "config":{
                        "cloudAddress":"{{cloudurl}}",
                        "relayID":"{{apikey}}",
                        "ssl":{
                            "key":"{{sslCertsPath}}/client.key.pem",
                            "cert":"{{sslCertsPath}}/client.cert.pem",
                            "ca":[
                                "{{sslCertsPath}}/ca.cert.pem",
                                "{{sslCertsPath}}/intermediate.cert.pem"
                            ]
                        },
                        "versionsFile":"{{relayFirmwareVersionFile}}",
                        "factoryVersionsFile": "{{factoryFirmwareVersionFile}}",
                        "userVersionsFile": "{{userFirmwareVersionFile}}",
                        "upgradeVersionsFile": "{{upgradeFirmwareVersionFile}}",
                        "relayInfo": {
                            "pairingCode": "{{pairingCode}}",
                            "serialNumber": "{{apikey}}",
                            "hardwareVersion": "{{hardwareVersion}}",
                            "radioConfig": "{{radioConfig}}",
                            "ledConfig": "{{ledConfig}}",
                            "cloudServer": "{{cloudurl}}",
                            "devicejsServer": "{{clouddevicejsurl}}",
                            "devicedbServer": "{{cloudddburl}}",
                            "partitionScheme": "{{partitionScheme}}",
                            "ethernetMac": "{{ethernetmac}}"   
                        }
                    }
                },
                {
                    "path":"${thisdir}/../../wigwag-core-modules/SchedulerEngine",
                    "config":{
                        "logLevel": 2 //Available- error- 0, warn- 1, info- 2, debug- 3, trace- 4
                    }
                },
                // {
                //     "path":"${thisdir}/../AppServer",
                //     "config":{
                //         "authentication":{
                //             "enabled":true,
                //             "cloudAPISecret":"{{apisecret}}",
                //             "redirectURL":"/wigwag-ui/s/login/",
                //             "cloudRedirectURL":"{{cloudurl}}/s/login"
                //         },
                //         "port":443,
                //         "ssl":{
                //             "key":"{{sslCertsPath}}/client.key.pem",
                //             "cert":"{{sslCertsPath}}/client.cert.pem",
                //             "ca":[
                //                 "{{sslCertsPath}}/ca.cert.pem",
                //                 "{{sslCertsPath}}/intermediate.cert.pem"
                //             ]
                //         },
                //         "relayID":"{{apikey}}"
                //     }
                // },
                // {
                //     "path":"${thisdir}/../APIProxy",
                //     "config":{
                //         "cloudAPISecret":"{{apisecret}}",
                //         "apiKey":"hello",
                //         "apiSecret":"asdfdsfa"
                //     }
                // },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/WigWagMobileUI",
                //     "config":{

                //     }
                // },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/wigwag-ui",
                //     "config":{
                //         "cloudAPISecret":"{{apisecret}}"
                //     }
                // },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/WWRelayWebUI",
                //     "config":{

                //     }
                // },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/RuleUI",
                //     "config":{
                //         "debug_mode":true,
                //         "debug_level":3,    // goes up to 3, default 1
                //         "RULE_NODE_TYPES_DIRECTORY":[
                //             "${thisdir}/../RuleEngine/src/nodes"
                //         ],
                //         "FORMS_DIR":[
                //             {
                //                 "path":"${thisdir}/../../wigwag-core-modules/RuleUI/schemaFormDialogs",
                //                 "ignores":[
                //                     "_public"
                //                 ]
                //             }
                //         ]
                //     }
                // },
                // {
                //     "path":"${thisdir}/../../wigwag-core-modules/moods",
                //     "config":{
                //         "jwtSecret":"IXPySxxr0f5X2CIqdB45eK",
                //         "apiKey":"{{apikey}}",
                //         "apiSecret":"{{apisecret}}"
                //     }
                // },
                {
                    "path":"${thisdir}/../../wigwag-core-modules/DevStateManager",
                    "config": {
                        "logLevel": 2,
                        "pollingResolution": 500,
                        "defaultPollingRate": 51000,
                        "maxPollingCycles": 65535,
                        "pollingSchemes": {
                            "fast": {
                                "interval": 21500,
                                "interfaces": [
                                    "Facades/HasTemperature",
                                    "Facades/ThermostatGStatus",
                                    "Facades/ThermostatSupplyTemperature",
                                    "Facades/ThermostatReturnTemperature",
                                    "Facades/ThermostatW1Status",
                                    "Facades/ThermostatW2Status",
                                    "Facades/ThermostatY1Status",
                                    "Facades/ThermostatY2Status"
                                ]  
                            },
                            "medium": {
                                "interval": 293500,
                                "interfaces": [
                                    "Facades/ThermostatMode",
                                    "Facades/OccupiedCoolTemperatureLevel",
                                    "Facades/OccupiedHeatTemperatureLevel",
                                    "Facades/UnoccupiedCoolTemperatureLevel",
                                    "Facades/UnoccupiedHeatTemperatureLevel",
                                    "Facades/ThermostatFanMode",
                                    "Facades/OccupancyMode"
                                ]
                            },
                            "slow": {
                                "interval": 900000,
                                "interfaces": [
                                ]
                            },
                            "never": {
                                "interval": 0,
                                "interfaces": [
                                    "Facades/KeypadLockLevel",
                                    "Facades/TemperatureDisplayMode",
                                    "Facades/ThermostatDeadband",
                                    "Facades/Humidity",
                                    "Facades/HasMotion",
                                    "Facades/UnoccupiedAutoTemperatureLevel",
                                    "Facades/OccupiedAutoTemperatureLevel"
                                ]
                            }
                        }
                    }
                }
            ]
        }
    }
}
EOF3


echo "Cleaning up..."
cd /wigwag
rm -rf $TEMPDIR
rm -f $SELF/$0
sync
echo "OK. upgrade complete. You need to reboot your RP100"
exit 0
### tarball below
