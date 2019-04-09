#### Building self-extracting intermediate upgrades

```
./addbsdtar.sh --binary libarchive-3.3.2/bsdtar u-with-tar.sh u.sh 
./addpayload.sh --binary mbed-bridge-0.1.tar.bz2 mbed-bridge-0.1 u-with-tar.sh
```

`mbed-bridge-0.1.tar.bz2` should be the entire mbed/ folder, which has this in it:

```
drwxr-xr-x 18 root root 4096 Feb  8 21:59 mbed-cloud-edge-confidential-w
drwxr-xr-x  5 root root 4096 Feb  6 23:20 mbed-cloud-edge-js
drwxr-xr-x  3 root root 4096 Feb  8 21:42 mbed-devicejs-bridge
```

