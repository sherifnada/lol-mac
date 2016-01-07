var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');
var regionPrefix = "http://spectator.na.lol.riotgames.com/observer-mode/rest/";
var featuredGamesUrl = regionPrefix + "featured";
var metadataUrl = regionPrefix + "consumer/getGameMetaData/"; 
var getLastChunkInfo = "consumer/getLastChunkInfo";
var getGameDataChunk = "consumer/getGameDataChunk";
var getKeyFrame = "consumer/getKeyFrame";

var lastChunkId; 
var lastKeyFrameId;
var directoryPrefix; 

// this is to convert from BSON to base64; attach this to the global object to make it easier to call.
// this takes in a string
global.btoa = function(str) {
    return new Buffer(str).toString('base64');  //this is used instead because we are running this in node and not using the actual browser window; actual browser command is window.btoa
};

// we do the same with the decoding back to base64; again attach to the gloabl object to make it easier to call.
// this takes in a string as well
global.atob = function(str) {
    return new Buffer(str).toString('binary');  //this is used instead because we are running this in node and not using the actual browser window; actual browser command is window.atob
};

var getJson = function(url){  
    var response = getResponse(url);
    return JSON.parse(response);
};

var getResponse = function(url){
    var request = new XMLHttpRequest();
    request.open('GET',url, false);
    request.send();
    return request.responseText;
}

var getChunkInfo = function(platformId, gameId){
    var url = regionPrefix + getLastChunkInfo + "/" + platformId + "/" + gameId + "/1/token"; 
    return getJson(url);   
};

function getRandomGameId(){
    return getJson(featuredGamesUrl)['gameList'][0]['gameId'];
}

var mkdirSync = function (path) {
  try {
    fs.mkdirSync(path);
  } catch(e) {
    if ( e.code != 'EEXIST' ) throw e;
  }
}

var writeToDirectory = function(path, file){
    fs.writeFile(path, file, function(err, data){
        if (err){
            console.log("Unable to write file to disk: " + path);
            console.log(err);
        }
    });
};

var saveVersion = function(){
    var url = regionPrefix + "consumer/version";
    var version = getResponse(url);
    console.log(directoryPrefix);
    console.log("Printing version");
    console.log(version);
    console.log("Printing encoded version");
    console.log(btoa(version));
    console.log("Printing original version");
    console.log(atob(version));
    writeToDirectory(directoryPrefix + "version", version);
    console.log("Saved version: " + version);
};

var saveGameMetaData = function(platformId, gameId){
    var url = metadataUrl + platformId + "/" + gameId + "/1/token";
    var metadata = getResponse(url);
    console.log(url);
    writeToDirectory(directoryPrefix + "metadata", metadata);
    console.log("Saved metadata: " + metadata);
};

var saveChunkInfo = function(platformId, gameId){
    var info = getChunkInfo(platformId, gameId);
    console.log("printing info");
    console.log(info);
    console.log("printing conversion");
    console.log(btoa(info));
    var chunkId = info['chunkId'];
    writeToDirectory(directoryPrefix + chunkId + "info", info); 
};

var saveLatestChunks = function(platformId, gameId){
    var chunkInfo = getChunkInfo(platformId, gameId);
    var chunkId = chunkInfo['chunkId'];
    var keyFrameId = chunkInfo['keyFrameId'];

    saveChunkInfo(platformId, gameId);

    if (lastChunkId !== chunkId){
        console.log("CHUNK ID: " + chunkId);
        lastChunkId = chunkId;
        url = regionPrefix + "/" + getGameDataChunk + "/" + platformId + "/" + gameId + "/" + chunkId + "/token"; 
        var chunk = getResponse(url);
        writeToDirectory(directoryPrefix + chunkId, chunk);
    }

    if (keyFrameId !== lastKeyFrameId){
        console.log("KEYFRAME ID: " + keyFrameId);
        lastKeyFrameId = keyFrameId;
        url = regionPrefix + "/" + getKeyFrame + "/" + platformId + "/" + gameId + "/" + chunkId + "/token"; 
        var keyFrame = getResponse(url);
        writeToDirectory(directoryPrefix + "kf" + keyFrameId, keyFrame);
        
    }
};

var saveChunksUntilGameEnd = function(platformId, gameId){
    var chunkInfo = getChunkInfo(platformId, gameId);
    var chunkId = chunkInfo['chunkId'];
    var endGameChunkId = chunkInfo['endGameChunkId'];
    
    saveLatestChunks(platformId, gameId);

    //if game has ended, exit
    if (endGameChunkId && +endGameChunkId !== 0){
        console.log("GAME HAS ENDED. EXITING");
        process.exit();
    }
};

// var gameId = getRandomGameId();

exports.saveSpectatorData = function(platformId, gameId){
    //TODO: Store timestamps
    mkdirSync("./replays");
    directoryPrefix = "./replays/" + gameId + "/";
    mkdirSync(directoryPrefix);

    saveVersion();
    saveGameMetaData(platformId, gameId);
    saveChunkInfo(platformId, gameId);
    saveChunksUntilGameEnd(platformId, gameId);

    //check for new chunk every 10 seconds
    setInterval( function(){ saveChunksUntilGameEnd(platformId, gameId); } , 10000);
}

console.log(new Buffer('Hello World!').toString('base64'));
exports.saveSpectatorData("NA1", getRandomGameId());