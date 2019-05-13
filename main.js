//jshint esversion: 6
//jshint evil:true
//jshint multistr : true

// requires
const keys = require("./keys.json");
const ytdl = require("ytdl-core");
const YouTube = require("youtube-node");
const ypi = require('youtube-playlist-info');
const Datastore = require("nedb");
const Discord = require("discord.js");
const Osu = require('osu-api');
const Cleverbot = require('cleverbot-node');
const parseString = require('xml2js').parseString;
const request = require('request');


// varables

// transfer this to settings
const eightBallMessages = [
  "It is certain",
  "It is decidedly so",
  "Without a doubt",
  "Yes, definitely",
  "You may rely on it",
  "As I see it, yes",
  "Most likely",
  "Outlook good",
  "Yes",
  "Signs point to yes",
  "Reply hazy try again",
  "Ask again later",
  "Better not tell you now",
  "Cannot predict now",
  "ask again",
  "Don't count on it",
  "My reply is no",
  "My sources say no",
  "Outlook not so good",
  "Very doubtful"];
const messageTimeout = 30 * 1000, timePerLetter = 83;
const ZeroChar = "\u200B";
const bingImageUrl = "https://api.cognitive.microsoft.com/bing/v5.0/images/search?q=", bingSearchUrl = "";

// databases
const playlists = new Datastore({filename:"playlists.db", autoload:true});
const infoDb = new Datastore({filename:"info.db", autoload:true});
const guildDb = new Datastore({filename:"guilds.db", autoload:true});
const userDb = new Datastore({filename:"users.db", autoload:true});

// news
const bot = new Discord.Client()
const osu = new Osu.Api(keys.osu);
const youtube = new YouTube();
const cleverbot = new Cleverbot();

// editable vars
let guildData = {};
let eve = "138765720614993920";
let lockdown = 0;

// prototypes
// home made replace all function
String.prototype.replaceAll = function(search, replacement) {
  return this.split(search).join(replacement);
};

// home made "includes" function which can also be passed an array of objects to look for
String.prototype.contains = function(str) {
  // if we are given an array of things to look for
  if (str instanceof Array) {

    // go through the array,
    for (let i in str) {
      
      // and see if we have it
      if (this.contains(str[i])) {
        // if we do, no point in continuing the search, return true!
        return true;
      }
    }
  }

  return (this.indexOf(str) !== -1);
};

// get a random index from the array
Array.prototype.randomIndex = function() {
  return this[Math.floor(Math.random()*this.length)];
};

// discord things

// this is used to send a message, but also start and stop typing
Discord.TextChannel.prototype.sendMessage2 = function(txt, options) {
  // create variable for reference later (sicne 'this' wont refer to actual this)
  let ch = this;

  // create the promise and return it
  return new Promise((resolve, reject) => {
    // start typing
    ch.startTyping();

    // create a timeout set for at most 5 seconds
    setTimeout(() => {
      // send the message and stop typing
      ch.sendMessage(txt, options).then(resolve).catch(reject);
      ch.stopTyping();
    }, Math.min(timePerLetter * txt.length, 5000));
  });
};

// see sendMessage2
Discord.Message.prototype.reply2 = function(txt, options) {
  let msg = this;
  return new Promise((resolve, reject) => {
    msg.channel.startTyping();
    setTimeout(() => {
      msg.reply(txt, options).then(resolve).catch(reject);
      msg.channel.stopTyping();
    }, Math.min(timePerLetter * (txt.substring((bot.user+"").length)).length, 5000));
  });
};

// see sendMessage2
Discord.Message.prototype.edit2 = function(txt, options) {
  let msg = this;
  return new Promise((resolve, reject) => {
    msg.channel.startTyping();
    setTimeout(() => {
      msg.edit(txt, options).then(resolve).catch(reject);
      msg.channel.stopTyping();
    }, Math.min(timePerLetter * txt.length, 5000));
  });
};


// error helper, this is called whenever there is an error
console.error = function() {
  if (arguments["0"].message.contains("promise")) return;
  throw arguments["0"];
};


// function declarations

// run this when the bot is DMed
function dmMessage(msg) {
  if (msg.content.startsWith("settings")) {
    const list = ["My current settings:"];
    list.push("**showJoinMessages**: show join and leave messages.");
    list.push("**guestRole**: the role to add new members to.");
    list.push("**prefix**: set the prefix.");
    list.push("**xp**: turn xp on or off.");
    list.push("**deleteMessages**: should the bot delete it's and the messages that activate it?");
    return msg.reply(list.join("\n"));
  }
  return ask(msg);
}

// if the bot needs to be restarted
function restart(msg) {
  if (!msg) return process.exit(0);

  return process.exit(0);

  // needs to be fixed
  if (voiceConnection) {
    voiceConnection.channel.leave();
    msg.reply2("Restarting!").then(() => {
      return process.exit(0);
    });
  } else {
    msg.reply2("Restarting!").then(() => {
      return process.exit(0);
    });
  }
}

// when the bot is mentioned
function ask(msg) {
  const c = msg.content;

  if (c.contains(["your", "name", "like"])) return msg.reply2("I like my name too.").then(deleteMsg);
  if (c.contains(["your", "name"]))         return msg.reply2("My name is " + bot.user.username + ".").then(deleteMsg);
  if (c.contains(["your", "hobbies"]))      return msg.reply2("I like playing video games! ").then(deleteMsg);

  return Cleverbot.prepare(() => {
    cleverbot.write(msg.cleanContent.replace(bot.user.username, "").trim(), (response) => {
      msg.reply2(response.message).then(deleteMsg);
    });
  });
}

// when someone asks for help
function helpmsg(p) {
  // p is the prefix
  p = "**" + p;
  let help = "Here are my commands:\n";

  // general commands
  help += p+"8ball [message]** get an 8ball response\n";
  help += p+"roll [number]** rolls a number between 0 and [number], or 100 if number is not specified\n";
  help += p+"flip** flips a coin\n";
  help += p+"anime [anime title]** gets an anime listing from MAL\n";
  help += p+"search [query]** search for something\n";
  help += p+"image [query]** search for an image\n";
  help += p+"story** get a story\n";
  help += "\n";

  //osu commands
  help += "__Osu commands__\n";
  help += p+"osu set [username]** set's your osu username\n";
  help += p+"osu topranks [username] [mode]** view the user's top ranks, or your own if none is specified\n";
  help += p+"osu userinfo [username] [mode]** view the user's info, or your own if none is specified\n";
  help += "(more on the way)\n";
  help += "\n";

  // music commands
  help += "__Music commands__\n";
  help += p+"join [channel]** joins the voice channel [channel], or join whatever channel you are in\n";
  help += p+"disconnect** leaves voice\n";
  help += p+"play [url/search]** plays the url, or looks for a video with that search, and plays that, alsu used to resume playback\n";
  help += p+"pause** pauses playback\n";
  help += p+"skip** skips to the next song\n";
  help += p+"next** same as ^\n";
  help += p+"np** shows the currently playing song\n";
  help += "\n";

  // playlist commands
  help += "__Playlist commands__\n"; p += "playlist ";
  help += p+"create [playlist title]** creates a playlist with the title [title]\n"; p += "[playlist title] ";
  help += p+"add [url/search]** adds the url to the playlist, or adds the first video from the search \n";
  help += p+"remove [url/search]** same as ^ except removes\n";
  help += p+"setpublic** toggles the publicity of the playlist\n";
  help += p+"play** plays the playlist";
  return help;
}


// classes
class GuildData {
  constructor(guild, data) {
    this.guild = guild;
    this.voiceConnection = undefined;
    this.musicChannel = undefined;
    this.dispatcher = undefined;
    this.volume = 0.25;
    this.queue = [];
    this.current = undefined;
    this.times = [];
    this.timerCount = 0;

    // settings
    this.prefix = "-";
    this.showJoinMessages = 1;
    this.xp = 1;
    this.guestRole = undefined;
    this.deleteMessages = 1;

    // load settings
    if (data) for(let s in data) this[s] = data[s];
  }
  getData() {
    return {
      _id:this.guild.id,
      prefix:this.prefix,
      showJoinMessages:this.showJoinMessages,
      xp:this.xp,
      guestRole:this.guestRole,
      deleteMessages:this.deleteMessages
    };
  }
  adminCommands(msg) {
    if (msg.content.startsWith("set")) return this.setSetting(msg);
    if (msg.content.startsWith("list")) return this.listSetting(msg);
  }
  setSetting(msg) {
    // prepare vars
    msg.content = msg.content.substring(4).trim();
    let data = msg.content.split(' '), setting = data[0], value = data[1];

    // do things
    if (!this[setting]) return msg.reply2("setting " + setting + " not found, pm `settings` to see a proper list (case sensitive)");
    if (!value) return msg.reply2("you must specify an value");

    switch(setting) {
      case "prefix": this.prefix = value; break;
      case "guestRole": this.guestRole = value; break;

      default: {
        value = parseBool(value);
        if (!isNaN(value)) argument = value;
        else return msg.reply2("value but be either `1`, `0`, `true` or `false`");
      }
    }

    msg.reply2(setting + " was set to " + value);
  }
  listSetting(msg) {
    msg.content = msg.content.substring(4).trim();
    let data = msg.content.split(' '), setting = data[0];
    if (!this[setting]) return msg.reply2("setting `" + setting + "` not found, pm `settings` to see a proper list");
    msg.reply2("setting `" + setting + "` is currently set to `" + this[setting] + "`");
  }

  commands(msg) {
    if (!this.xp) {
      getUser(msg.author.id, (userInfo) => {
        userInfo.xp += 1 + Math.random() * 4;
        saveUser(userInfo);
      });
    }
    if (!msg.content.startsWith(this.prefix)) return;
    msg.content = msg.content.substring(this.prefix.length);
    let cmd = 1;
    setTimeout(() => {
      if (lockdown) return msg.reply("I am currently in a locked down state, please be patient while I am fixed.");
      else if (cmd && msg.deletable && this.deleteMessages) msg.delete(1000).then(none).catch(console.error);
    }, (messageTimeout-1000)*(!lockdown));
    if (lockdown) return;

    // misc commands
    if (msg.content.startsWith("8ball")) return msg.reply2(eightBallMessages.randomIndex());
    if (msg.content.startsWith("flip"))  return msg.reply2("I flipped you " + ["Heads", "Tails"].randomIndex());
    if (msg.content.startsWith("roll"))  return roll(msg);
    if (msg.content.startsWith("anime")) return animeSearch(msg);
    if (msg.content.startsWith("image")) return imageSearch(msg);
    if (msg.content.startsWith("search")) return search(msg);
    if (msg.content.startsWith("story")) return story(msg);
    if (msg.content.startsWith("settings")) {
      let out = "My current settings for this guild: ```";
      let d = this.getData();
      for (let x in d) {
        out += x + ": " + d[x] + "\n";
      }
      out += "```";
      msg.reply2(out);
    }
    if (msg.author == this.guild.owner) this.adminCommands(msg);

    if (msg.content.startsWith("help")) return msg.reply2(helpmsg(this.prefix));
    if (msg.content.startsWith("restart")) return restart(msg);
    if (msg.content.startsWith("ask") || msg.content.contains(bot.user)) return ask(msg);
    if (msg.content.startsWith("osu")) return osuCommands(msg);
    if (msg.content.startsWith("info")) return info(msg);

    // actual music commands
    if (msg.content.startsWith("playlist")) return playlistCommands(msg);
    if (msg.content.startsWith("ytp")) return this.ytpCommands(msg);
    if (msg.content.startsWith("disconnect")) return this.disconnect(msg);
    if (msg.content.startsWith("leave")) return this.disconnect(msg);
    if (msg.content.startsWith("volume")) return this.setVolume(msg);
    if (msg.content.startsWith("join")) return this.joinVC(msg);
    if (msg.content.startsWith("play")) return this.play(msg);
    if (msg.content.startsWith("queue")) return this.showQueue(msg);
    if (msg.content.startsWith("stop")) return this.stop(msg);
    if (msg.content.startsWith("pause")) return this.stop(msg);
    if (msg.content.startsWith("next")) return this.next(msg);
    if (msg.content.startsWith("skip")) return this.next(msg);
    if (msg.content.startsWith("unqueue")) return this.unQueue(msg);
    if (msg.content.startsWith("np")) return this.np(msg);
    if (msg.content.startsWith("musicchannel")) return this.setMusicChannel(msg);
    cmd = 0;
  }
  setMusicChannel(msg) {
    this.musicChannel = msg.channel;
    msg.reply2("This is now the music channel").then(deleteMsg);
  }
  joinVC(msg) {
    let channelTitle = msg.content.substring(4).toLowerCase().trim();
    this.musicChannel = msg.channel;

    function doSoloThingy(msg2, t) {
      function onceFound(connection) {
        msg2.edit2("Connected!").then(deleteMsg);
        t.voiceConnection = connection;
      }

      if (channelTitle === "") {
        t.guild.fetchMember(msg.author).then(member => {
            if (member.voiceChannel) member.voiceChannel.join().then(onceFound);
            else msg2.edit2("You need to specify a channel or be in one yourself.").then(deleteMsg);
          });
        return;
      }

      // find the channel
      for (let channel of t.guild.channels) {
        if (channel instanceof Array) channel = channel[1];
        if (channel.type == "voice" && channel.name.toLowerCase() == channelTitle) {
          channel.join().then(onceFound).catch(console.error);
          break;
        }
      }
      if (msg2.edits.length == 1) msg2.edit2(`That voice channel was not found (${channelTitle})`).then(deleteMsg);
    }

    msg.channel.sendMessage2("One moment...").then((msg2) => doSoloThingy(msg2, this));
  }
  disconnect(msg) {
    let t = this;
    if (this.voiceConnection) {
      if (msg) msg.reply2("I'm leaving voice now").then((msg) => {
        deleteMsg(msg);
        t.voiceConnection.channel.leave();
        t.voiceConnection = null;
      });
    } else {
      msg.reply2("I'm not in a voice channel!").then(deleteMsg);
    }
  }
  stop(msg) {
    if (this.dispatcher) {
      this.dispatcher.pause();
      msg.reply2("I've paused the music for you.").then(deleteMsg);
    } else {
      msg.reply2("I'm not playing any music.").then(deleteMsg);
    }
  }
  next(msg) {
    let t = this;
    if (this.dispatcher) {
      if (this.times && this.times.length > 0 && msg.content.startsWith("next")) {
        this.timerCount++;
    		let stream = ytdl(this.current.id, {filter:'audioonly'});

        this.dispatcher = this.voiceConnection.playStream(stream, {volume:this.volume, seek:this.times[this.timerCount].time, passes:2});
        this.dispatcher.on("start", () => {
          t.musicChannel.sendMessage2("Listening to: **" + t.times[t.timerCount].title + "**").then(deleteMsg);
        });
        this.dispatcher.on("error", (err) => {throw err;});
        this.dispatcher.on("speaking", (speaking) => {
          if (t.times && t.times[t.timerCount] && t.dispatcher.time/1000 >= t.times[t.timerCount].time && !t.dispatcher.paused) {
            // same as other one
            t.musicChannel.sendMessage2("Listening to: **" + t.times[t.timerCount].title + "**").then(deleteMsg);
            t.timerCount++;
          }
        });
        this.dispatcher.on("end", () => {
          t.dispatcher = null;
          if (t.queue.length > 0) t.playNext();
          else if (t.voiceConnection) {
            t.musicChannel.sendMessage2("I've finished playing the last song.").then(deleteMsg).catch(console.error);
          }
        });
        return;
      }
      msg.reply2("I'll play the next song for you.").then(deleteMsg);
      this.dispatcher.end();
    } else {
      msg.reply2("I'm not playing any music.").then(deleteMsg);
    }
  }
  play(msg) {
    let t = this;
    let content = msg.content.substring(4).trim();
    this.musicChannel = msg.channel;
    if (content === "") {
      if (this.dispatcher && dispatcher.paused) msg.reply2("I'm resuming the music.").then(this.dispatcher.resume);
      else msg.reply2("You need to send me a link to play");
      return;
    }

    let items = content.split(",");
    let search = function(thing) {
      youtube.search(thing, 10, (err, result) => {
        for (let i = 0; i < result.items.length; i++) {
          let item = result.items[i].id;
          if (item.kind == "youtube#video") {
            setInfo(item.videoId, result.items[i].snippet.title);
            return t.addQueue(item.videoId, msg);
          }
        }
        msg.reply2("I could not find a video with that search.").then(deleteMsg);
      });
    };
    for (let thing in items) {
      thing = items[thing].trim();
      if (thing.indexOf("youtu") === -1) return search(thing);
      if (thing.indexOf("youtube") > 0) thing = thing.split('=')[1].split("&")[0];
      else thing = thing.split("/")[3].split("&")[0];
      t.addQueue(thing, msg);
    }
  }
  playNext() {
    let t = this;
    if (this.voiceConnection) {
      this.current = this.nextItem();
      let stream = ytdl(this.current.id, {filter:'audioonly'});
      
      getInfo(this.current.id, (info) => {
        if (info.livestream) {
          t.musicChannel.sendMessage2("I cannot play livestreams.").then(deleteMsg);
          return playNext();
        }

        t.timerCount = 0; 
        t.data = [];

        getImportantTimes(t.current.id, (data1) => {
          t.times = data1;
        });

        t.dispatcher = t.voiceConnection.playStream(stream, {volume:t.volume, passes:2, seek:0});

        t.dispatcher.on("start", () => {
          makeEmbed("I'm now playing", t.current.title, toUrl(t.current.id), t.musicChannel);
        });

        t.dispatcher.on("error", (err) => {
          throw err;
        });

        t.dispatcher.on("speaking", (speaking) => {
          if (t.times && t.times[t.timerCount] && t.dispatcher.time/1000 >= t.times[t.timerCount].time && !t.dispatcher.paused) {
            //TODO: make like np
            t.musicChannel.sendMessage2("Listening to: **" + t.times[t.timerCount].title + "**").then(deleteMsg);
            t.timerCount++;
          }
        });

        t.dispatcher.on("end", () => {
          t.dispatcher = null; 
          t.data = [];
          if (t.queue.length > 0) t.playNext();
          else if (t.voiceConnection) {
            t.musicChannel.sendMessage2("I've finished playing the last song.").then(deleteMsg).catch(console.error);
          }
        });
      });
    } else {
      console.log("playnext() without voiceConnection");
    }
  }
  setVolume(msg) {
    let vol = parseInt(msg.content.substring("volume".length).trim());
    if (isNaN(vol)) return msg.reply2("The volume is at " + this.volume).then(deleteMsg);
    if (vol < 1) vol *= 100;
    this.volume = vol/100;
    if (this.dispatcher) this.dispatcher.setVolumeLogarithmic(this.volume);
    msg.reply2("I've set the volume to " + (this.volume * 100)).then(deleteMsg);
  }

  // queue things
  np(msg) {
    if (!this.current) msg.channel.sendMessage2("I'm not playing anything right now");

    let song = "";
    if (this.times && this.times[this.timerCount-1]) {
      song += "?t=";
      let times1 = fixTime(this.times[this.timerCount-1].time).split(":"), c = 0;
      if (this.times.length == 3) {song += times1[c] + "h"; c++;}
      if (times1[c] > 0) song += times1[c] + "m"; c++;
      if (times1[c] > 0) song += times1[c] + "s";
    }

    makeEmbed("Now Playing", this.current.title, toUrl(this.current.id) + song, msg.channel, (this.times && this.times[this.timerCount]) ? this.times[this.timerCount].title : undefined);
  }
  showQueue(msg) {
    let t = this;
    if (this.queue.length === 0 && (!this.times || this.times.length === 0))
      return msg.reply2("My queue is empty.").then(deleteMsg);

    let list = [], list2 = [], count = 0;
    if (this.times && this.times.length > this.timerCount)
      for (let i = this.timerCount; i < this.times.length; i++)
        list.push(fixTime(t.times[i].time) + ":" + t.times[i].title);

    for (let q in this.queue)
      list2.push({name: (count++) + ":" + t.queue[q].title, value: `[${t.queue[q].title}](${toUrl(t.queue[q].id)})`});
    msg.reply2(list.join("\n"), {"embed" : {fields : list2}}).then(deleteMsg).catch(console.error);
  }
  unQueue(msg) {
    let pos = parseInt(msg.content.substring(7).trim());
    if (isNaN(pos) || this.queue.length < pos) return msg.reply2("That is not a valid position.").then(deleteMsg);

    let removed = queue.splice(pos, this.queue.length);
    msg.reply2(removed.title + " was removed from the queue.").then(deleteMsg);
  }
  addQueue(id, msg) {
    let t = this;
    getTitle(id, (title) => {
      t.queue.push(new QueueItem(id, title));
      if (msg) msg.reply2("I've added " + title + " to the queue").then(deleteMsg);
      if (!t.dispatcher) t.playNext();
    });
  }
  nextItem() {
    return this.queue.shift();
  }

  // youtube playlist things
  ytpCommands(msg) {
    msg.content = msg.content.substring(3).trim();
    if (msg.content.startsWith("play")) return this.ytpPlay(msg);
    if (msg.content.startsWith("show")) return this.ytpShow(msg);
  }
  ytpPlay(msg) {
    let t = this;
    this.ytpShow(msg, (i) => {
      console.log(i);
      t.queue.push(new QueueItem(i.id, i.title));
    }, "Added the following to the queue:", () => {
      if (!t.dispatcher) t.playNext();
    });
  }
  ytpShow(msg, doEach, text, then) {
    let max = 8; max++;

    // get the pid
    let pid = msg.content.substring(4).trim();
    if (pid.indexOf("youtube") > 0) pid = pid.split('=')[1].split("&")[0];
    else pid = pid.split("/")[3].split("&")[0];

    getPlaylist(pid, (ids) => {
      let out = [], c = 0, lng = Math.min(max, ids.length);

      for (let i = 0; i < lng; i++) {
        if (doEach) doEach(ids[i]);
        out.push({name:ids[i].title, value: `[Link](${toUrl(ids[i].id)})`});
      }

      out.push({name: "and " + (ids.length-lng) + " more.", value : ZeroChar});
      msg.reply(text ? text : "", {"embed":{fields:out}}).then(deleteMsg).catch(console.log);
      if (then) then();
    });
  }
}
class QueueItem {
  constructor(id, title) {
    this.title = title;
    if (!title) getTitle(id, (title) => {this.title = title;});
    this.id = id;
    this.stream = 0;
  }
  someOtherFunction() {
    //doThings
  }
  toString() {
    return this.title;
  }
}
class UserInfo {
  constructor(id, data) {
    this._id = id;
    this.xp = 0;
    this.osu = undefined;

    // if loading a user
    if (data) {
      // loop through
      for (let s in data) {
        // and set
        this[s] = data[s];
      }
    }
  }

  save() {
    saveUser(this);
  }
}

// youtube and db things
function toUrl(id) {
  return "https://youtu.be/" + id;
}

function getImportantTimes(id, doThis) {
  return getInfo(id, (info) => {
    // if the video is shorter than 20 mins, return because its probably not a compilation
    if (info.length_seconds < 60 * 20) return; 

    // get the description lines, break it into lines
    let lines = info.description.split("\n");
    let data = [];

    // loop through all the lines
    for (let l = 0; l < lines.length; l++) {
      // get the line characters
      let line = lines[l].split(" ");
      let found = 0;

      // loop through all characters in the line
      for (let n = 0; n < line.length; n++) {

        // look for times
        let times = line[n].split("-")[0].split(":").reverse();
        let time = 0;
        // if no possible instances of a time, no point in continuing
        if (times.length === 0) break; 

        // if time is possible but not found yet (ie this character isnt a numbe)
        if (isNaN(parseInt2(times[0])) || isNaN(parseInt2(times[1]))) continue;

        // foudn a number

        // tbh no idea what this does
        for (let t in times) 
          time += parseInt2(times[t]) * Math.pow(60, t);

        if (found) 
          data[data.length - 1].title = data[data.length - 1].title.replace(line[n], "").trim();
        else 
          data.push({title:lines[l].replace(line[n], "").trim(), time:time});

        found = 1;
      }
    }

    // finally do stuff with the data
    doThis(data);
  });
}
function getTitle(id, next) {
  getInfo(id, (info) => {
    next(info.title);
  });
}

// function to either pull from local database, or load info 
function getInfo(id, next) {

  // look in the info database
  infoDb.findOne({_id:id}, (err, doc) => {
    // if there was an error dont continue (no reason this would be called)
    if (err) throw err;

    // check the local database
    if (doc && doc.title) {
      // found in local database, return
      return next(doc);
    }

    // not found in infodb, pull from youtube
    ytdl.getInfo(id, null, (err, info) => {
      // if there was an error dont continue (no reason this would be called)
      if (err) throw err;

      // put the info in the infodb
      setInfo(id, info);

      // run the next funtion
      next(info);
    });
  });
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

function getPlaylist(pid, next) {
  let list = [];

  // load the db
  ypi.playlistInfo(keys.youtube, pid, (items) => {

    // loop through the items in the playlisst
    for (let p in items) {

      // get the id
      const id = items[p].resourceId.videoId;

      // add to the list
      list.push({id:id, title:items[p].title});
    }

    // run the function
    next(list);
  });
}


// user db things
function getUser(id, next) {
  userDb.findOne({_id:id}, (err, user) => {
    if (err) return console.error(err);
    if (user) return next(new UserInfo(id, user));
    user = new UserInfo(id);
    userDb.insert(user);
    next(user);
  });
}
function saveUser(userInfo, next) {
  userDb.update({_id:userInfo._id}, userInfo, (err) => {
    if (!err) return console.error(err);
    if (next) next();
  });
}

// playlist things
function playlistCommands(msg) {
  msg.content = msg.content.substring(8).trim();
  let plistTitle = msg.content.split(' ')[0];
  if (msg.content.startsWith("create")) {
  if (msg.content.split(' ').length > 2) return msg.reply2("The title cannot contain spaces.").then(deleteMsg);
    plistTitle = msg.content.split(' ')[1];
  }

  playlists.findOne({_id:plistTitle}, (err, plist) => {
    if (msg.content.startsWith("create")) {
      // check if one with that title already exists
      if (plist) return msg.reply2("A playlist with that title already exists.").then(deleteMsg);

      // make a playlist
      let title = msg.content.split(' ')[1];
      if (title.split(' ').length > 1) return msg.reply2("The title cannot contain spaces.").then(deleteMsg);
      plist = new Playlist(title, msg.author.id);
      playlists.insert(plist);
      playlists.update({_id:title}, plist);
      return msg.reply2("Created the playlist " + title).then(deleteMsg);
    }

    try {
      if (plist) msg.content = msg.content.substring(plistTitle.length).trim();
      else return msg.reply2("Playlist not found").then(deleteMsg);
    } catch (err1) {
      msg.reply2("An error occurred: " + err1).then(deleteMsg);
    }

    let char = '©';
    for (let q in plist.list) {
      let y = plist.list[q];
      delete plist.list[q];
      q = q.replaceAll("©", ".");
      plist.list[q] = y;
    }


    if (err) return msg.reply2("That playlist was not found.").then(deleteMsg);
    if (!plist) return msg.reply2("you forgot to specify a playlist, or none was found").then(deleteMsg);
    if (!plist.public && msg.author.id !== plist.ownerID) return msg.reply2("This playlist is not public.").then(deleteMsg);

    else if (msg.content.startsWith( "add"  )) playlistAdd   (msg, plist);
    else if (msg.content.startsWith("remove")) playlistRem   (msg, plist);
    else if (msg.content.startsWith( "play" )) playlistPlay  (msg, plist);
    else if (msg.content.startsWith("public")) playlistPublic(msg, plist);
    else if (msg.content.startsWith( "show" )) playlistShow  (msg, plist);
  });
}
function Playlist(title, ownerID) {
  return {
    _id:title,
    ownerID:ownerID,
    public:0,
    list:{}
  };
}
function playlistAdd(msg) {
  msg.content = msg.content.substring(3).trim();
  let id = msg.content;
  if (id.indexOf("youtube") > 0) id = id.split('=')[1].split("&")[0];
  else id = id.split("/")[3].split("&")[0];

  function dothing() {
    getTitle(id, (title) => {
      plist.list[id] = title;
      msg.reply2("Added " + title + ".").then(deleteMsg);
      playlistSave(plist);
    });
  }

  if (id.indexOf("youtu") === -1) {
    youtube.search(id, 10, (err, result) => {
      for (let i = 0; i < result.items.length; i++) {
        let item = result.items[i].id;
        if (item.kind == "youtube#video") {
          id = item.videoId;
          return dothing();
        }
      }
      msg.reply2("I could not find a video with that search.");
    });
    return;
  }
  dothing();
}
function playlistRem(msg, plist) {
  msg.content = msg.content.substring(6).trim();
  let index = plist[msg.content];
  getTitle(index, (title) => {
    msg.reply2("Removed " + title + ".").then(deleteMsg);
  });
  delete plist.list[index];
  playlistSave(plist);
}
function playlistPlay(msg, plist) {
  for (let url in plist.list) addQueue(url);
  msg.reply2("Adding **" + plist._id + "** to the queue.").then(deleteMsg);
}
function playlistPublic(msg, plist) {
  plist.public = 1;
  playlistSave(plist);
  msg.reply2("**" + plist._id + "** is now public.").then(deleteMsg);
}
function playlistShow(msg, plist) {
  let list = [];
  for (let url in plist.list) list.push({name : plist.list[url], value: `[${plist.list[url]}](${url})`});
  msg.reply2("\ ", {"embed" : {fields : list}}).then(deleteMsg).catch(console.error);
}
function playlistSave(plist) {
  let char = '©';
  let list = {};
  for (let q in plist.list) {
    let y = plist.list[q];
    q = q.replaceAll(".", "©");
    list[q] = y;
  }
  plist.list = list;
  playlists.update({_id:plist._id}, plist, console.log);
}


// osu things
function setMode(msg) {
  osu.setMode(Osu.Modes.osu);
  if (msg.content.contains("taiko")) return osu.setMode(Osu.Modes.taiko);
  if (msg.content.contains("mania")) return osu.setMode(Osu.Modes.osumania);
  if (msg.content.contains("ctb")) return osu.setMode(Osu.Modes.CtB);
  return 1;
}
function osuCommands(msg) {
  msg.content = msg.content.substring(3).trim();

  if (!setMode(msg)) {
    msg.content = msg.content.split(" ");
    msg.content.splice(-1);
    msg.content = msg.content.join(" ");
  }

  if (msg.content.startsWith("set"))      return setOsu(msg);
  if (msg.content.startsWith("topranks")) return topRanks(msg);
  if (msg.content.startsWith("userinfo")) return userInfo(msg);
  //if (msg.content.startsWith("")) return (msg);
}
function setOsu(msg) {
  msg.content = msg.content.substring(3).trim();
  getUser(msg.author.id, (user) => {
    if (user.osu) msg.reply2("I'm changing your username from `" + user.osu + "` to `" + msg.content + "`.");
    else msg.reply2("I'm setting your username to `" + msg.content + "`.");
    user.osu = msg.content;
    user.save();
  });
}
function topRanks(msg) {
  function get(user) {
    osu.getUserBest(user, (err, list) => {
      let out = [], count = 0;
      function go() {
        if (count < list.length) {
          getMapTitle(list[count]).then((title) => {
            //TODO: make nicer and make sure its /b/, also mods
            let mod = Osu.mods.get(list[count].mods);
            out.push({name:count + ": " + list[count].pp + "pp (" + list[count].rank + ")", value: `[${title}](https://osu.ppy.sh/b/${list[count].beatmap_id})`});
            go();
            count++;
          });
        } else {
          msg.reply2('', {embed:{fields:out}}).then(deleteMsg).catch(console.err);
        }
      }
      go();
    });
  }
  let u = msg.content.substring(7).trim();
  if (u) return get(u);
  getUser(msg.author.id, (info) => {
    if (info.osu) get(info.osu);
    else msg.reply2("You must either specify a username, or set yours with -osu set [your username].");
  });
}
function userInfo(msg) {
  function get(user) {
    osu.getUser(user, (err, data) => {
      let out = "";
      out += data.username + " level " + data.level + "(played " + data.playcount + "times)\n";
      out += "rank " + data.pp_rank + " (" + data.pp_country_rank + ")\n";
      out += "ranked score: " + data.ranked_score + "(" + data.total_score + " total)";
      msg.channel.sendMessage2(out).then(deleteMsg);
    });
  }
  let u = msg.content.substring(8).trim();
  if (u) return get(u);
  getUser(msg.author.id, (info) => {
    if (info.osu) get(info.osu);
    else msg.reply2("You must either specify a username, or set yours with -osu set [your username].");
  });
}
function getMapTitle(id) {
  return new Promise((resolve, reject) => {
    osu.getBeatmap(id, (err, map) => {
      if (err) return reject(err);
      resolve(map);
    });
  });
}



// utilities

// remake this with the new discordjs embed tools, should be very easy
function makeEmbed(desc, text, link, channel, otherText) {

  let embed = {
    "embed" : {
      fields: [{
          name: `${desc}`, 
          value: `[${text}](${link})`
        }
      ]
    }
  };
  if (channel) channel.sendMessage2(otherText === undefined ? "" : otherText, embed).then(deleteMsg).catch(console.error);
  return embed;
}
function parseInt2(i) {
  try {
    return parseInt(i.replace(/\D/g, ''));
  } catch(e) {
    return NaN;
  }
}
function fixTime(s) {
  let h = (s - s % (60*60)) / (60*60); s -= h * (60*60);
  let m = (s - s % 60) / 60; s -= m * 60;
  return `${h>0?h+":":""}${m>0?m+":":""}${s}`;
}
function deleteMsg(msg) {
  return;
  //if (guildData[msg.guild.id].deleteMessages) msg.delete(messageTimeout).then(none).catch(console.error);
}
function parseBool(str) {
  str = str.toLowerCase();
  const t = parseInt2(str);
  if (!isNaN(t) && (t == 1 || t === 0)) return t;
  if (str.contains("true") || str.contains("on")) return 1;
  if (str.contains("false") || str.contains("off")) return 0;
  return NaN;
}

// helper for promises when we dont need to do anything after
function none() {

}

// other commands

// roll command
function roll(msg) {
  // look for a number after roll command
  const max = parseInt(msg.content.split(" ")[1].length) || 100;

  // reply with the result
  msg.reply(`rolled ${Math.ceil(Math.random() * max)}/${max}`);
}


// get all users we are serving (i think?)
function info(msg) {
  let users = 0;
  let ul = "";
  //let p = guildData[msg.channel.guild.id].prefix;

  // get all the guilds
  const a = bot.guilds.array();

  // loop through all guilds
  for (let g in a) {

    // if he guild has members
    if (a[g].members) {

      // get all users
      const x = a[g].members.array();

      // loop through all users
      for (let u in x) {
        // if the user exists, and we havent already counted it
        if (!isNaN(u) && !ul.contains(x[u].user.id)) {
          // add it to the list so we can check for it later
          ul += x[u].user.id + "\n";

          // increase the user coutn
          users++;
        }
      }
    }
  }

  const info = {
    embed: {
      color:0, 
      author:{
        name: bot.user.username, 
        icon_url:bot.user.avatarURL
      }, 
       description:`\nHai! My name is ${bot.user.username}\n[Invite me](https://discordapp.com/oauth2/authorize?client_id=248305269858107402&scope=bot&permissions=8)`, 
       fields:[
        {
          name:'Help Command', 
           value:p+'help', 
           inline:true
        }, {
           name: 'Servers', 
           value: `${bot.guilds.size}`, 
           inline: true
        }, {
           name: 'Users',
           value: `${users}`, 
           inline: true
        }, {
           name: 'Author',  
           value: '[Eve](https://osu.ppy.sh/u/5013564)', 
           inline: true
        }, {
           name: 'Source',  
           value: '[Github](https://github.com/ayyEve/Cybel)', 
           inline:true
        }
      ]
    }
  };
  msg.channel.sendMessage('', info).then().catch(console.err);
}


function animeSearch(msg) {
  const username = settings.malUsername;
  const password = settings.malPassword;

  const anime = msg.content.substring(5).trim().split(" ").join("+");
  const url = `https://myanimelist.net/api/anime/search.xml?q=${anime}`;
  const auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

  // do the request
  request({url:url, headers:{"Authorization":auth}}, (error, response, body) => {
    // check status codes
    if (response.statusCode === 204) return msg.channel.sendMessage2("I could not find that anime, sorry.");
    if (response.statusCode !== 200) return console.error(response.statusCode);


    parseString(body, (err, res) => {
      const _anime = res.anime.entry[0], synopsis = _anime.synopsis[0].split("."), d = ".";
      const synopsis = (synopsis[0] +d+ synopsis[1] +d+ synopsis[2]).replaceAll("&#039;", "'").replaceAll("&mdash;", "—");
      const str = `${_anime.english[0]} (${_anime.title[0]}): ${_anime.episodes[0]} episodes (${_anime.score[0]}*s), ${_anime.status[0]}\`\`\`${synopsis}...\`\`\`${_anime.image[0]}`;
     
      // send all 
      msg.channel.sendMessage2(str).then(deleteMsg);
    });
  });
}
function story(msg) {
  request("http://www.fmylife.com/random", (error, response, body) => {
    let d = body.split("data-text="), out = [];
    for (let line in d) {
      if (!d[line].split) continue;
      line = d[line].split('"');
      out.push(line[1]);
    }
    out = out.randomIndex();
    out = out.substring(0, out.length - 3).trim();
    out = out.replaceAll("&quot;", '"');
    msg.channel.sendMessage2(out);
  });
}

// bing things
function getBingThing(url, key, next) {
  request({url:url, headers:{"Ocp-Apim-Subscription-Key":key}}, next);
}
function imageSearch(msg) {
  let count = 5;
  msg.content = msg.content.substring(5).trim();

  let url = bingSearchUrl + msg.content + "&count=" + count;
  if (!msg.channel.name.contains("nsfw")) url += "&safeSearch=strict";

  getBingThing(url, keys.bing.search, (error, response, body) => {
    if (response.statusCode === 204) return msg.channel.sendMessage2("I could not find an image with that search, sorry.");
    if (response.statusCode !== 200) return console.error(response.statusCode);
    body = JSON.parse(body);
    let str = "Out of " + body.totalEstimatedMatches + "results, here are the top 5 for " + msg.content + "\n";
    for (let i = 0; i < count; i++) str += body.value[i].contentUrl + "\n";
    msg.channel.sendMessage2(str).then(deleteMsg);
  });
}
function search(msg) {
  let count = 5;
  msg.content = msg.content.substring(6).trim();

  let url = "https://api.cognitive.microsoft.com/bing/v5.0/search?q=" + msg.content + "&count=" + count;
  if (!msg.channel.name.contains("nsfw")) url += "&safeSearch=strict";

  getBingThing(url, bingSearchKey, (error, response, body) => {
    if (response.statusCode === 204) return msg.channel.sendMessage2("I could not find anything with that search, sorry.");
    if (response.statusCode !== 200) return console.error(response.statusCode);
    body = JSON.parse(body);

    let str = "Out of " + body.totalEstimatedMatches + " here are the top 5 results for " + msg.content + "\n";
    for (let i = 0; i < count; i++) str += body.value[i].contentUrl + "\n";
    msg.channel.sendMessage2(str).then(deleteMsg);
  });
}


// setup the bot

// when the bot is ready
bot.on("ready", () => {
  console.log("Cybel is ready :D");

  bot.fetchUser(eve).then(user => {eve = user;}).catch(console.error);
  
  // define g to make the function declaration easy
  let g;

  // define the guild initialization function
  const doGuild = function(err, doc) {
    if (!err && !doc) guildDb.insert(new GuildData(g).getData());
    if (!err && doc) guildData[g.id] = doc;
  };

  // initialize all guilds
  for (g in bot.guilds) {
    guildDb.findOne({_id:g.id}, doGuild);
  }

  // setup a timer to update guild data
  setInterval(() => {
    // if we have no guilds dont continue;
    if (guildData.length < 1) return;

    // loop through all guilds
    for (let guild in guildData) {
      // update the data
      if (guildData[guild]) guildDb.update({_id:guild}, guildData[guild].getData());
    }
  }, 500);

  // setup the bot's visual stuff
  bot.user.setGame("Flirting with Eve.");
  // if the avatar should be updated
  //bot.user.setAvatar('./avatar.jpg').then(user=>console.log('Avatar set!')).catch(console.error);
});

// when we lose connection to the discord api
bot.on("disconnect", () => {
  console.log("disconnected");
  bot.login(keys.discord);
});

// when we join a guild
bot.on("guildCreate", (guild) => {
  const g = new GuildData(guild);
  guildData[guild.id] = g;
  guildDb.insert(g.getData());

  // send messages into the guild and to the owner of the guild
  guild.defaultChannel.sendMessage2("Haii! I'm Cybel, pleased to meet you all! I hope we can get along :3");
  guild.owner.sendMessage("Hai! If you would like to know what kind of setting you can change just pm me `settings` and I can give you a list~");
});

// when we leave a guild
bot.on("guildDelete", (guild) => {
  // just delete the guild data
  // no need to update the guildDB, it will be updated later
  delete guildData[guild.id];
});


bot.on("message", (msg) => {
  // if we send the message return
  if (msg.author.id === bot.user.id) return;

  // if the message is a dm, run the dmMessage function and exit this code block
  if (msg.channel.type == "dm") return dmMessage(msg);

  // if someone mentioned the bot
  if (msg.content.contains(bot.user.id)) return ask(msg);

  // if for some reason we dont have the guild in the data table, add it
  if (!guildData[msg.guild.id]) guildData[msg.guild.id] = new GuildData(msg.guild);

  // run the guild commands
  guildData[msg.guild.id].commands(msg);
});

// when a member joins
bot.on("guildMemberAdd", (member) => {
  let data = guildData[member.guild.id];
  if (data.showJoinMessages) {
    member.guild.defaultChannel.sendMessage2(`${member}, Welcome to ${member.guild.name}!`);
  }
});

// when a member leaves
bot.on("guildMemberRemove", (member) => {
  let data = guildData[member.guild.id];
  if (data.showJoinMessages) {
    member.guild.defaultChannel.sendMessage2(`${member}, has left the guild`);
  }
});

// login to discord
bot.login(keys.discord);

// login to youtube
youtube.setKey(keys.youtube);

// if theres any other issues, catch them
process.on('uncaughtException', (err) => {
  lockdown = 1;
  try {
    if (err == "restart") throw restart;
    eve.sendMessage(err + "\n" + err.stack).then(none).catch(console.error);
  } catch (err1) {
    if (err == "restart") throw restart;
    console.log(err1);
    process.exit(1);
  }
});