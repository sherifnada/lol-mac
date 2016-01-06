var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var fs = require('fs');

var regionPrefix = "http://spectator.na.lol.riotgames.com/observer-mode/rest";
var featuredGamesUrl = regionPrefix + "/featured";
var getLastChunkInfo = "consumer/getLastChunkInfo"; //<platformId>/<gameID>/1/token"
var getGameDataChunk = "consumer/getGameDataChunk";
var getKeyFrame = "consumer/getKeyFrame";
var lastChunkId; 
var lastKeyFrameId;

var getJson = function(url){  
    var request = new XMLHttpRequest();
    request.responseType = 'json';
    request.open('GET',url, false);
    request.send();
    return JSON.parse(request.responseText);
};

var getResponse = function(url){
    var request = new XMLHttpRequest();
    request.open('GET',url, false);
    request.send();
    return request.responseText;
}

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

function saveGameChunks(platformId, gameId){
    
    //get chunk Id
    var url = regionPrefix + "/" + getLastChunkInfo + "/" + platformId + "/" + gameId + "/1/token"; 
    var chunkInfo = getJson(url);
    var chunkId = chunkInfo['chunkId'];
    var keyFrameId = chunkInfo['keyFrameId'];
    var endGameChunkId = chunkInfo['endGameChunkId'];

    if (lastChunkId !== chunkId){
        console.log("CHUNK ID: " + chunkId);

        lastChunkId = chunkId;
        url = regionPrefix + "/" + getGameDataChunk + "/" + platformId + "/" + gameId + "/" + chunkId + "/token"; 
        var chunk = String(getResponse(url));
        mkdirSync("./replays/" + gameId + "/");
        fs.writeFile("./replays/" + gameId + "/" + chunkId, chunk, function(err, data){
            if (err){
                console.log("Unable to write chunk to disk. ");
                console.log(err);
            }
        });
    }

    if (keyFrameId !== lastKeyFrameId){
        console.log("KEYFRAME ID: " + keyFrameId);
        lastKeyFrameId = keyFrameId;
        url = regionPrefix + "/" + getKeyFrame + "/" + platformId + "/" + gameId + "/" + chunkId + "/token"; 
        var keyFrame = String(getResponse(url));
        mkdirSync("./replays/" + gameId + "/");
        fs.writeFile("./replays/" + gameId + "/" + chunkId + "kf", chunk, function(err, data){
            if (err){
                console.log("Unable to write chunk to disk. ");
                console.log(err);
            }
        });
    }

    //if game has ended, exit
    if (endGameChunkId && +endGameChunkId !== 0){
        console.log("GAME DONE. EXITING");
        process.exit();
    }
}

var gameId = getRandomGameId();
console.log("GAME ID: " + gameId);
//check for new chunk every 10 seconds
setInterval( function(){ saveGameChunks("NA1", gameId); } , 10000);