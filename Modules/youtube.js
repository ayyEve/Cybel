// requires
const keys       = require("../keys.json");
const ytdl       = require("ytdl-core");
const YouTube    = require("youtube-node");
const ytPlaylist = require('youtube-playlist');
const Datastore  = require("nedb");

const infoDb     = new Datastore({filename:"info.db", autoload:true});
const youtube    = new YouTube();



// login to youtube
if (keys.youtubeKey) {
    youtube.setKey(keys.youtube);
    console.log("Youtube key found, loading...");
} else {
    console.log("Youtube key not found, skipping");
}


// youtube and db things
function toUrl(id) {
    return "https://youtu.be/" + id;
}
  
async function getImportantTimes(id, next) {
    if (next) throw(new Error("next deprecated"));

    const info = await getInfo(id);

    // if the video is shorter than 20 mins, return because its probably not a compilation
    if (info.length_seconds < 60 * 20) return; 

    // get the description lines, break it into lines
    let lines = info.description.split("\n");
    let data = [];

    // define the regex
    const regex = /\d*\d:\d*\d(:\d\d)?/;

    // loop through all the lines
    for (let l = 0; l < lines.length; l++) {
        // get the line characters
        let line = lines[l];
        const results = regex.exec(line);

        // if the regex wasnt found, continue
        if (!results) continue;

        // 
        let time = results[0];
        // will be xx:xx[:xx]

        // remove the time from the line, we dont want it there
        line.replace(time, "");

        // check for another time, incase the line indicated a range (dumb yes)
        let res2 = regex.exec(line);
        if (res2) {
            line.replace(res2[0], "");
        }

        // convert the time to numbers
        let times = time.split(':').reverse();

        // dont need the string anymore, so use it for the seconds
        time = 0;
        // this gets the time in seconds, and multiplies it by 60 to the power of the index, 
        // since the format is ss:mm:hh when flipped, it would multply 60 by by 1:2:3 for each
        for (let t in times) {
            let x = parseInt(times[t]);
            time += x * Math.pow(60, t);
        }

        data.push({title:line, time:time});
    }

    return data;
}

async function getTitle(id, next) {
    if (next) throw(new Error("next deprecated"));

    const info = await getInfo(id);
    return info.title;
}
  
// function to either pull from local database, or load info 
async function getInfo(id) {
    const p = new Promise((resolve, reject) => {
        // look in the info database
        infoDb.findOne({_id:id}, (err, doc) => {
            // if there was an error dont continue (no reason this would be called)
            if (err) reject(err);
        
            // check the local database
            if (doc && doc.title) {
                // found in local database, return
                return resolve(doc);
            }

            // not found in infodb, pull from youtube
            ytdl.getInfo(id, null, (err, info) => {
                // if there was an error dont continue (no reason this would be called)
                if (err) resolve(err);

                // put the info in the infodb
                setInfo(id, info);

                // run the next funtion
                resolve(info);
            });
        });
    });
    
    const res = await p;
    if (res) return res;
}
  
function setInfo(id, info) {
    // if its a url get the id
    if (id.contains("=")) {
        const i = id.indexOf("="); 
        id = id.substring(i, id.length - i);
    };
  
    // put the info inside the infodb
    infoDb.insert({_id:id, info});
}

// convert a playlist from youtube
async function getPlaylist(playlistID) {
    const plist = await ytPlaylist("youtube.com/playlist?list=" + playlistID, ['id', 'name']);
    return plist.data.playlist;
}

class QueueItem {
    constructor(id, title) {
        this.title = title;
        if (!title) {
            getTitle(id, (title) => {this.title = title;});
        }

        this.id = id;
        this.stream = 0;
    }
    toString() {
        return this.title;
    }
}




module.exports = {
  toUrl : toUrl,
  getImportantTimes : getImportantTimes,

  getTitle : getTitle,
  getInfo : getInfo,
  setInfo : setInfo,
  getPlaylist : getPlaylist,

  QueueItem : QueueItem,
};
