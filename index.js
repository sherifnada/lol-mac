var express = require('express');
var app = express();
var prefix = "/observer-mode/rest/";
var port = 3000;
var fs = require('fs');

//first & last chunks and keyframes that we saved during the game
var firstChunkId;
var firstKeyFrameId;
var lastChunkId; 
var lastKeyFrameId;

//the chunkId currently being served
var currentChunkId; 
var currentKeyFrameId;

//hardcoded for now. Need to write a wrapper to supply gameId once game has been selected.
var gameId = "2061443257";
// var encryptionKey = "oaiY9zliChOfI8/6ci0BAsHn/lxiA3L5";

var directoryPrefix = __dirname + "/replays/" + gameId;

function fileExists(path){
    var out;
    try{
        fs.statSync(path);
        return true;
    } catch (err){
        console.log(err);
        return false;
    }
}

function init(){
    var sessionDir = directoryPrefix + "/sessionData";
    if (fileExists(sessionDir)){
        fs.readFile(sessionDir, function(err, data){
            // firstChunkId = data['firstSavedChunkId'];
            // lastChunkId = data['lastSavedChunkId'];

            //more hardcode...proof of concept bois
            firstChunkId = 17; 
            lastChunkId = 76; 

            firstKeyFrameId = data['firstSavedKeyFrameId'];
            lastKeyFrameId = data['lastSavedKeyFrameId'];

            currentChunkId = firstChunkId;
        });
    }else{
        throw new Error("game sessionData was not found: " + sessionDir);
    }

}

app.get("/", function(req, res){
    console.log("visited /");
    res.send("HELLO WORLD!");
});

app.get(prefix + "consumer/version", function(req, res){
    //This is awful. But just for proof of concept. I promise.
    //TODO: shoot sherif.
    res.send("1.82.102");
});

//get metadata
app.get(prefix + "consumer/getGameMetaData/:platformId/:gameId/*/token", function(req, res){
    console.log("platformId: " + req.params.platformId);
    //TODO: Add platform ID into directory to allow cross-platform recording
    fs.readFile(directoryPrefix + "/metadata.json", function(err, data){
        if (err)
            console.log(err);
        else{
            // console.log("metadata sent");
            // console.log(data.toString());
            res.send(JSON.parse(data.toString()));
        }
    });
});

//get gameInfo
app.get(prefix + "consumer/getLastChunkInfo/:platform/:gameId/*/token", function(req, res){
    var fileDir = directoryPrefix + "/" + currentChunkId + "info.json";
    console.log(fileDir);
    if (fileExists(fileDir)){
        fs.readFile(fileDir, function(err, data){
            if (err)
                console.log(err);
            else{
                console.log(data.toString());
                res.send(JSON.parse(data.toString()));     
            }
        }); 
    }else{
        console.log("ERROR: COULD NOT FIND INFO FOR CHUNK#: " + currentChunkId);
    }
});

//get data chunk
app.get(prefix + "consumer/getGameDataChunk/:platformId/:gameId/:chunkId/token", function(req, res){
    var fileDir = directoryPrefix + "/" + req.params.chunkId;
    if (fileExists(fileDir)){
        res.sendFile(fileDir);
        if (+req.params.chunkId === currentChunkId){
            currentChunkId++;

            //if game has ended then end in 3 minutes
            if (currentChunkId == lastChunkId){
                setInterval(3000 * 60, function(){ process.exit(); });
            }
        }
    }else{
        console.log("ERROR: COULD NOT FIND CHUNK: " + currentChunkId);
    }
});

//get keyframe
app.get(prefix + "consumer/getKeyFrame/:playformId/:gameId/:keyFrameId/token", function(req, res){
    var fileDir = directoryPrefix + "/kf" + req.params.keyFrameId;
    if (fileExists(fileDir)){
        res.sendFile(fileDir);
    }else{
        console.log("ERROR: CANNOT FIND KEYFRAME: " + req.params.keyFrameId);
    }
});

init();
var server = app.listen(port);
console.log("Listening on port " + port);