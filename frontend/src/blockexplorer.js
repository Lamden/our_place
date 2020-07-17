'use strict';

const config = require('./js/config').config
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
    let updateQueue = []

    const wipeDB = async () => {
        console.log('-----WIPING DATABASE-----')
        await wipeUpdatesDB()
        console.log('Updates DB wiped')
        client.set("lastProcessed", 787);
        console.log('lastProcessed DB wiped')
        client.flushdb();
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
                        if (tx.transaction.payload.contract === config.smartContract &&
                            tx.transaction.payload.function === 'colorPixel'){
                            if (tx.result === "None"){
                                if (Array.isArray(tx.state)){
                                    tx.state.forEach(s => {
                                        let contractName = s.key.split(":")[0].split(".")[0]
                                        let variableName = s.key.split(":")[0].split(".")[1]
                                        let changeInfo = s.key.split(/:(.+)/)[1].split(":")

                                        if (contractName === config.smartContract &&
                                            variableName === "S"){

                                            updateQueue.push({
                                                x: Number(changeInfo[0]),
                                                y: Number(changeInfo[1]),
                                                color: s.value,
                                                timestamp: tx.transaction.metadata.timestamp * 1000
                                            })
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

    const processUpdateQueue = async () => {
        if (updateQueue.length === 0) {
            setTimeout(processUpdateQueue, 100)
            return
        }else{
            let update = updateQueue.shift()
            console.log(`doing ${update.x}:${update.y}`)
            await storeRedisPlaceInfo(update.x, update.y, update.color, update.timestamp)
            processUpdateQueue()
        }
    }

    const storeRedisPlaceInfo = (x, y, color, timestamp ) => {
        return new Promise((resolve) => {
            client.get(`${x}:${y}`, function(err, prev_timestamp){
                console.log({x,y,color, prev_timestamp, timestamp})
                console.log(Number(prev_timestamp) < timestamp)
                if (Number(prev_timestamp) < timestamp || prev_timestamp == null){
                    console.log("!!!! REDIS !!!! CREATING REDIS !!!!")
                    client.get("place", function (err, place){
                        let xPos = x * 3
                        let yMod = y * 3000
                        let startingPos = xPos + yMod
                        if (place.substring(startingPos, startingPos + 3) !== color){
                            client.set("place", stringSplice(place, startingPos, 3, color), () => {
                                console.log(`resolving ${x}:${y}`)
                                resolve()
                            })
                            client.set(`${x}:${y}`, timestamp, () => {
                                storeMongooseUpdate(x, y, color, timestamp)
                            })
                        }else resolve()
                    })
                }else resolve()
            })
        })
    }

    const storeMongooseUpdate = (x, y, color, timestamp ) => {
        models.Updates.findOne({x, y}, function(err, pixel) {
            if(!err) {
                if(!pixel) {
                    console.log("!!!! MONGO !!!!! Creating NEW update !!!!")
                    pixel = new models.Updates({x, y, color, timestamp: new Date(timestamp)})
                    pixel.save()
                }else{
                    if (pixel.timestamp < new Date(timestamp)){
                        console.log("!!!! MONGO !!!!! MODIFYTING UPDATE !!!!")
                        pixel.color = color;
                        pixel.timestamp = new Date(timestamp);
                        pixel.save()
                    }else console.log("!!!! MONGO !!!!! NEWER UPDATE !!!!")
                }
            }else console.log(err)
        });
    }

    const getBlock_MN = (blockNum) => {
        send(url_getBlockNum + blockNum, storeBlock)
    }

    const getLatestBlock_MN = () => {
        //console.log('getting latest block number')
        return new Promise((resolve, reject) => {
            const returnRes = async (res) => {
                resolve(res)
            }
            send(url_getLastestBlock, returnRes)
        })
    }

    const checkForBlocks = async () => {
        let response = await getLatestBlock_MN()

        if (!response.error){
            latestBlockNum = response.number
            if (latestBlockNum < currBlockNum){
                await wipeDB();
                wipeOnStartup = false;
            }else{
                //console.log('lastestBlockNum: ' + latestBlockNum)
                //console.log('currBlockNum: ' + currBlockNum)
                if (latestBlockNum === currBlockNum){
                    if (alreadyCheckedCount < maxCheckCount) alreadyCheckedCount = alreadyCheckedCount + 1;
                    checkNextIn = 100 * alreadyCheckedCount;
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

        console.log('wipeOnStartup', wipeOnStartup)
        if (wipeOnStartup) {
            await wipeDB()
            wipeOnStartup = false
            lastProcessed = 787
        }

        console.log({lastProcessed})
        if (lastProcessed == null) {
            client.set("lastProcessed", 0)
            currBlockNum = 0
        } else {
            currBlockNum = Number(lastProcessed)
        }

        //await wipeUpdatesDB()
        processUpdateQueue()
        timerId = setTimeout(checkForBlocks, 0);
    });
}

module.exports = (wipeOnStartup, client, mongoose) => {
    const http = require('https');

    var updates = new mongoose.Schema({
        x: Number,
        y: Number,
        color: String,
        timestamp: Date
    });

    var Updates = mongoose.model('Updates', updates, 'updates');

    databaseLoader(http, client, wipeOnStartup, mongoose, {Updates});
};
