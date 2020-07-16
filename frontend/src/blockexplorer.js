'use strict';


const DBUSER = process.env.DBUSER || 'myUserAdmin'
const DBPWD = process.env.DBPWD || 'dbadmin'
var wipeOnStartup = process.env.WIPE === 'no' ? false : true;

const validators = require('types-validate-assert')
const { validateTypes } = validators;
const stringSplice = require("underscore.string/splice")

const masternode = {
    //ip: "138.68.247.223",
    ip: "testnet-master-1.lamden.io",
    port: "18080"
}

const isLamdenKey = ( key ) => {
    if (validateTypes.isStringHex(key) && key.length === 64) return true;
    return false;
};


const databaseLoader = (http, client, wipeOnStartup, mongoose, models) => {
    let currBlockNum = 1;
    let checkNextIn = 0;
    let maxCheckCount = 10;
    let alreadyCheckedCount = 0;
    const url_getBlockNum = `https://${masternode.ip}/blocks?num=`
    const url_getLastestBlock = `https://${masternode.ip}/latest_block`
    let latestBlockNum = 0;
    let currBatchMax = 0;
    let batchAmount = 25;
    let timerId;

    const wipeDB = async () => {
        console.log('-----WIPING DATABASE-----')
        await wipeUpdatesDB()
        console.log('Updates DB wiped')
        client.set("latestBlockNum", 0);
        console.log('latestBlockNum DB wiped')
        await loadDefaultPlaces()
        console.log('Place Cache reset')

        currBlockNum = 0;
        //timerId = setTimeout(checkForBlocks, 3000);
    }

    const resetCache = async () => {
        await loadDefaultPlaces()
        console.log('Place Cache reset')
        console.log('Cache Updating')
        await processUpdates()
        console.log('Cache Updated')
    }

    const wipeUpdatesDB = async () => {
        await models.Updates.deleteMany({}).then(res => console.log(res))
    }

    const loadDefaultPlaces = async  () => {
        let promise =  new Promise((resolver) => {
            let data = ""
            for (let x=0; x <= 999; x++){
                for (let y=0; y <= 999; y++){
                    data = data + "fff"
                    if (x === 999 && y === 999) {
                        resolver(data)
                    }
                }
            }
        })
        await promise.then((place) => {
            client.set(`place`, place);
        })

    }

    const processUpdates = async () => {
        await models.Updates.find({}).sort({"timestamp": 1}).then(updates => {
            updates.forEach(update => {
                storeRedisPlaceInfo(Number(update.x), Number(update.y), update.color)
            })
        })
    }

    const send = (url, callback) => {
        http.get(url, (resp) => {
            let data = '';

            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
            data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                try{
                    callback(JSON.parse(data))
                } catch (err){
                    console.log("Error: " + err.message);
                    callback({error: err.message})
                }
            });
        }).on("error", (err) => {
            console.log("Error: " + err.message);
            callback({error: err.message})
        });
    }

    const storeBlock = async (blockInfo) => {
        if (typeof blockInfo.error === 'undefined' && typeof blockInfo.number !== 'undefined'){
            client.get("lastProcessed", function(err, lastProcessed) {
                if (lastProcessed < blockInfo.number) client.set("lastProcessed", blockInfo.number)
            });

            if (typeof blockInfo.subblocks !== 'undefined'){
                blockInfo.subblocks.forEach(sb => {
                    sb.transactions.forEach((tx) => {
                        if (tx.transaction.payload.contract === 'con_our_place_test3' &&
                            tx.transaction.payload.function === 'colorPixel'){
                            if (tx.result === "None"){
                                if (Array.isArray(tx.state)){
                                    tx.state.forEach(s => {
                                        let contractName = s.key.split(":")[0].split(".")[0]
                                        let variableName = s.key.split(":")[0].split(".")[1]
                                        let changeInfo = s.key.split(/:(.+)/)[1].split(":")

                                        if (contractName === "con_our_place_test3" &&
                                            variableName === "S"){
                                            storeRedisPlaceInfo(
                                                Number(changeInfo[0]),
                                                Number(changeInfo[1]),
                                                s.value
                                            )
                                            storeMongooseUpdate(
                                                changeInfo[0],
                                                changeInfo[1],
                                                s.value,
                                                tx.transaction.metadata.timestamp
                                            )
                                        }
                                    })
                                }
                            }
                        }
                    })
                })
            }
            if (blockInfo.number === currBatchMax) {
                currBlockNum = currBatchMax
                timerId = setTimeout(checkForBlocks, 0);
            }
        }
    }

    const storeRedisPlaceInfo = async (x, y, color ) => {
        console.log('!----------REDIS----------------')
        console.log({x,y,color})
        let place = await new Promise((resolver) => {
            client.get("place", (err, place) => {
                resolver(place)
            })
        })
        let xPos = x * 3
        let yMod = y * 2997
        let startingPos = xPos + yMod
        console.log({xPos, yMod, startingPos})
        console.log({changing: place.substring(startingPos, startingPos + 3)})
        client.set("place", stringSplice(place, startingPos, 3, color))

        place = await new Promise((resolver) => {
            client.get("place", (err, place) => {
                resolver(place)
            })
        })
        console.log({changed: place.substring(startingPos, startingPos + 3)})
        console.log('-----------REDIS--------------!')
    }

    const storeMongooseUpdate = async (x, y, color, timestamp ) => {
        console.log('!---------MONGOOSE--------------')
        new models.Updates({x, y, color, timestamp: new Date(timestamp * 1000)}).save()
        console.log('-----------MONGOOSE-------------!')
    }

    const getBlock_MN = (blockNum) => {
        send(url_getBlockNum + blockNum, storeBlock)
    }

    const getLatestBlock_MN = () => {
        console.log('getting latest block number')
        return new Promise((resolve, reject) => {
            const returnRes = async (res) => {
                resolve(res)
            }
            send(url_getLastestBlock, returnRes)
        })
    }

    const checkForBlocks = async () => {
        let response = await getLatestBlock_MN()

        //models.Updates.find({}).then(res => console.log(res))

        if (!response.error){
            latestBlockNum = response.number
            if (latestBlockNum < currBlockNum){
                await wipeDB();
                wipeOnStartup = false;
            }else{
                console.log('lastestBlockNum: ' + latestBlockNum)
                console.log('currBlockNum: ' + currBlockNum)
                if (latestBlockNum === currBlockNum){
                    if (alreadyCheckedCount < maxCheckCount) alreadyCheckedCount = alreadyCheckedCount + 1;
                    checkNextIn = 500 * alreadyCheckedCount;
                    timerId = setTimeout(checkForBlocks, checkNextIn);
                }

                if (latestBlockNum > currBlockNum){
                    currBatchMax = currBlockNum + batchAmount;
                    if (currBatchMax > latestBlockNum) currBatchMax = latestBlockNum;
                    if (currBatchMax > 25) currBatchMax + 25
                    for (let i = currBlockNum + 1; i <= currBatchMax; i++) {
                        console.log('getting block: ' + i)
                        getBlock_MN(i)
                    }
                }

                if (latestBlockNum < currBlockNum) {
                    wipeDB();
                    timerId = setTimeout(checkForBlocks, 10000);
                }
            }
        }else{
            if (response.error = "socket hang up") checkForBlocks();
            else{
                console.log('Could not contact masternode, trying again in 10 seconds')
                timerId = setTimeout(checkForBlocks, 10000);
            }
        }
    }

    client.get("lastProcessed", async function(err, lastProcessed) {
        if (lastProcessed == null) {
            client.set("lastProcessed", 0)
            currBlockNum = 0
        } else {
            currBlockNum = Number(lastProcessed)
        }
        console.log('wipeOnStartup', wipeOnStartup)
        if (wipeOnStartup) {
            await wipeDB()
            wipeOnStartup = false
        }
        //await wipeUpdatesDB()
        timerId = setTimeout(checkForBlocks, 0);
    });
}

module.exports = (wipeOnStartup, client, mongoose) => {
    const http = require('https');

    var updates = new mongoose.Schema({
        x:  String,
        y: String,
        color: String,
        timestamp: Date
    });

    var Updates = mongoose.model('Updates', updates, 'updates');

    updates

    databaseLoader(http, client, wipeOnStartup, mongoose, {Updates});
};
