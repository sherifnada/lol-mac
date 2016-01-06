var regionPrefix = "http://spectator.na.lol.riotgames.com/observer-mode/rest";
var getLastChunkInfo = "/consumer/getLastChunkInfo"; //<platformId>/<gameID>/1/token"
// var gameID = "";
// var platformID = "NA1";

var getJson = function(url){
  return new Promise(function(resolve, reject){
    var request = new XMLHttpRequest();
    
    console.log('created request');

    request.addEventListener("load", function() {
      if (request.status >= 200 && request.status < 400) {
        resolve(request.response);
      } else {
        reject(Error(request.statusText));
      }
    });

    request.addEventListener("error", function(event) {
        reject(Error("Network error"));
    });

    request.responseType = 'json';
    request.open('GET',url, true);
    console.log('Request Opened');

    request.send();
    console.log('Request sent');
  });
};

function saveMatchPackets(platformId, gameId){
    //get packet Info, parse JSON
    var url = regionPrefix + "/" + getLastChunkInfo + "/" + platformId + "/" + gameId + "/1/token"; 
    getJson(url)
    .then(function(response){
        console.log(response);
    }).catch(function(error){
        console.log(error.message);
    });
}

saveMatchPackets("NA1", "2059897698");

