var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');
var regionPrefix = "http://spectator.na.lol.riotgames.com/observer-mode/rest/";
var featuredGamesUrl = regionPrefix + "featured";
var metadataUrl = regionPrefix + "consumer/getGameMetaData/"; 
var getLastChunkInfo = "consumer/getLastChunkInfo";
var getGameDataChunk = "consumer/getGameDataChunk";
var getKeyFrame = "consumer/getKeyFrame";

var currentChunkId;
var currentKeyFrameId;

var firstSavedChunkId = null;
var firstSavedKeyFrameId = null;
var lastSavedChunkId; 
var lastSavedKeyFrameId;
var directoryPrefix; 
var callbackThreadId;

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


var writeSessionData = function(){
    var sessionData = {
        firstSavedChunkId: firstSavedChunkId,
        firstSavedKeyFrameId: firstSavedKeyFrameId,
        lastSavedChunkId: lastSavedChunkId,
        lastSavedKeyFrameId: lastSavedKeyFrameId
    };

    writeToDirectory(directoryPrefix + "sessionData", JSON.stringify(sessionData));
};

var saveVersion = function(){
    var url = regionPrefix + "consumer/version";
    var version = getResponse(url);
    console.log(directoryPrefix);
    console.log("Version: " + version);
    writeToDirectory(directoryPrefix + "version", version);
};

var saveGameMetaData = function(platformId, gameId){
    var url = metadataUrl + platformId + "/" + gameId + "/1/token";
    var metadata = getResponse(url);
    // console.log(metadata);
    writeToDirectory(directoryPrefix + "metadata.json", JSON.stringify(metadata));
    console.log("Saved metadata: " + metadata);
};

var saveChunkInfo = function(platformId, gameId){
    var info = getChunkInfo(platformId, gameId);
    var chunkId = info['chunkId'];
    writeToDirectory(directoryPrefix + chunkId + "info.json", JSON.stringify(info)); 
};

var saveLatestChunks = function(platformId, gameId){
    var chunkInfo = getChunkInfo(platformId, gameId);
    var chunkId = chunkInfo['chunkId'];
    var keyFrameId = chunkInfo['keyFrameId'];

    saveChunkInfo(platformId, gameId);

    if (currentChunkId !== chunkId){
        if (firstSavedChunkId === null ) 
            firstSavedChunkId = chunkId;

        console.log("SAVED CHUNK ID: " + chunkId);
        currentChunkId = chunkId;
        var url = regionPrefix + getGameDataChunk + "/" + platformId + "/" + gameId + "/" + chunkId + "/token"; 
        var chunk = getResponse(url);
        writeToDirectory(directoryPrefix + chunkId, chunk);
    }

    if (keyFrameId !== currentKeyFrameId){
        if (firstSavedKeyFrameId === null)
            firstSavedKeyFrameId = keyFrameId;

        console.log("SAVED KEYFRAME ID: " + keyFrameId);
        currentKeyFrameId = keyFrameId;
        var url = regionPrefix + getKeyFrame + "/" + platformId + "/" + gameId + "/" + keyFrameId + "/token"; 
        var keyFrame = getResponse(url);
        writeToDirectory(directoryPrefix + "kf" + keyFrameId, keyFrame);
    }
};

var saveChunksUntilGameEnd = function(platformId, gameId){
    var chunkInfo = getChunkInfo(platformId, gameId);
    var chunkId = chunkInfo['chunkId'];
    var endGameChunkId = chunkInfo['endGameChunkId'];
    
    saveLatestChunks(platformId, gameId);

    //if this is the last chunk, exit
    if (endGameChunkId && +endGameChunkId === +chunkId){
        lastSavedChunkId = endGameChunkId;
        lastSavedKeyFrameId = chunkInfo['keyFrameId'];
        
        writeSessionData();

        console.log("Last Chunk ID: " + endGameChunkId);
        console.log("Current Chunk ID: " + chunkId);
        console.log("GAME HAS ENDED. EXITING");
        clearInterval(callbackThreadId);
    }
};

exports.saveSpectatorData = function(platformId, gameId){
    //TODO: Store timestamps ??
    masterDir = __dirname + "/../replays/";
    mkdirSync(masterDir);
    directoryPrefix = masterDir + gameId + "/";
    mkdirSync(directoryPrefix);

    saveVersion();
    saveGameMetaData(platformId, gameId);
    saveChunksUntilGameEnd(platformId, gameId);
    

    //check for new chunk every 10 seconds
    callbackThreadId = setInterval( function(){ saveChunksUntilGameEnd(platformId, gameId); } , 10000);
}

exports.saveSpectatorData("NA1", getRandomGameId());

