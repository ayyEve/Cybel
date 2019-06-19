// requires
const keys      = require("./keys.json");
const Datastore = require("nedb");
const Discord   = require("discord.js");

// this is used for streaming which is why its here 
const ytdl = require("ytdl-core");


// module imports

// helper functions
const _helpers  = require("./helpers");
const fixTime   = _helpers.fixTime;
const parseBool =  _helpers.parseBool;
const none      = _helpers.none;

// osu
const _osu        = require("./Modules/osu");
const osuCommands = _osu.osuCommands;

// misc
const _misc     = require("./Modules/misc");
const story     = _misc.story;
const roll      = _misc.roll;
const headTails = _misc.headTails;
const eightBall = _misc.eightBall;
const info      = _misc.info;
const helpmsg   = _misc.help;

// youtube
const _youtube          = require("./Modules/youtube");
const toUrl             = _youtube.toUrl;
const getImportantTimes = _youtube.getImportantTimes;
const QueueItem         = _youtube.QueueItem;
const getTitle          = _youtube.getTitle
const getInfo           = _youtube.getInfo
const setInfo           = _youtube.setInfo
const getPlaylist       = _youtube.getPlaylist

// myanimelist
const _myanimelist = require("./Modules/myanimelist");
const animeSearch  = _myanimelist.animeSearch;

// cleverbot
const _cleverbot = require("./Modules/cleverbot");
const ask        = _cleverbot.ask;


// databases
const guildDb = new Datastore({filename:"guilds.db", autoload:true});
const userDb = new Datastore({filename:"users.db", autoload:true});

// create bot
const bot = new Discord.Client();

// editable vars
let guildData = {};
let eve = "138765720614993920";

// functions

// run this when the bot is DMed
function dmMessage(msg) {
    if (msg.content.startsWith("settings")) {
        const list = ["My current settings:"];
        list.push("**showJoinMessages**: show join and leave messages.");
        list.push("**guestRole**: the role to add new members to.");
        list.push("**prefix**: set the prefix.");
        list.push("**xp**: turn xp on or off.");
        return msg.reply(list.join("\n"));
    }
    return ask(msg);
}

// if the bot needs to be restarted
async function restart(msg) {
    if (!msg) return process.exit(0);

    for (let i in guildData) {
        if (guildData[i].voiceConnection) {
            await guildData[i].voiceConnection.disconnect();
        }
    }
    return process.exit(0);
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

        this.times = []; // array of Time objects (time:time in seconds, title: title of the song);
        this.timerCount = 0; // the counter to keep track of times

        // settings
        this.prefix = "-";
        this.showJoinMessages = 1;
        this.xp = 1;
        this.guestRole = undefined;

        // load settings
        if (data) {
            for (let s in data) {
                this[s] = data[s];
            }
        }
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
        if (msg.content.startsWith("set")) {
            return this.setSetting(msg);
        }
        if (msg.content.startsWith("list")) {
            return this.listSetting(msg);
        }
    }

    setSetting(msg) {
        // prepare vars
        msg.content = msg.content.substring(4).trim();
        const data = msg.content.split(' ');
        const setting = data[0]
        const value = data[1];

        // do things
        if (!this[setting]) {
            return msg.reply("setting " + setting + " not found, pm `settings` to see a proper list (case sensitive)").catch(console.error);
        }

        if (!value) {
            return msg.reply("you must specify a value").catch(console.error);
        }

        switch (setting) {
            case "prefix": 
                this.prefix = value; 
            break;

            case "guestRole": 
                this.guestRole = value; 
            break;

          default: 
              value = parseBool(value);
              if (!isNaN(value)) {
                    argument = value;
              } else {
                    return msg.reply("value but be either `1`, `0`, `true` or `false`").catch(console.error);
              }
          break;
        }
        msg.reply(setting + " was set to " + value).catch(console.error);;
    }

    listSetting(msg) {
        msg.content = msg.content.substring(4).trim();
        const data = msg.content.split(' '), setting = data[0];

        if (!this[setting]) {
            return msg.reply("setting `" + setting + "` not found, pm `settings` to see a proper list").catch(console.error);
        }

        msg.reply("setting `" + setting + "` is currently set to `" + this[setting] + "`").catch(console.error);
    }

    async commands(msg) {
        // give xp for any message, not just comnmands

        if (this.xp) {
            let user = await getUser(msg.author.id);
            user.xp += 1 + Math.random() * 4;
            user.save();
        }

        // if its not a command, dont continue
        if (!msg.content.startsWith(this.prefix)) return;

        // remove the prefix from the text
        msg.content = msg.content.substring(this.prefix.length);

        // if the user wants to know the current settings
        if (msg.content.startsWith("settings")) {
            let out = "My current settings for this guild: ```";

            const d = this.getData();
            for (let x in d) {
                out += x + ": " + d[x] + "\n";
            }
            out += "```";
            msg.reply(out).catch(console.error);
        }

        // if the sender is the admin, check admin commands
        if (msg.author == this.guild.owner) this.adminCommands(msg);

        // some other commands
        if (msg.content.startsWith("help")) return msg.reply(helpmsg(this.prefix)).catch(console.error);
        if (msg.content.startsWith("info")) return info(msg);

        // maybe remove this
        if (msg.content.startsWith("restart")) return restart(msg);

        // module commands:
        if (msg.content.startsWith("anime")) return animeSearch(msg);
        if (msg.content.startsWith("story")) return story(msg);

        // misc
        if (msg.content.startsWith("8ball")) return eightBall(msg);
        if (msg.content.startsWith("flip"))  return headTails(msg);
        if (msg.content.startsWith("roll"))  return roll(msg);
        if (msg.content.startsWith("ask") || msg.content.contains(bot.user)) return ask(msg);
        if (msg.content.startsWith("osu")) return osuCommands(msg);

        // actual music commands:
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
    }


    // try to move these?
    setMusicChannel(msg) {
        this.musicChannel = msg.channel;
        msg.reply("This is now the music channel").catch(console.error);;
    }


    async joinVC(msg) {
        let channelTitle = msg.content.substring(4).toLowerCase().trim();
        this.musicChannel = msg.channel;

        // send a message letting the user know we're not dead
        const msg2 = await msg.channel.send("Connecting...");
    
        // if the user didnt specify a channel, try joining the one the user is in
        if (channelTitle === "") {
            // get the guild member
            const member = await this.guild.fetchMember(msg.author);

            // if the user is in a voice channel
            if (member.voiceChannel) {
                
                // check in case the user is in a vocie channel in another discord
                if (!msg.client.guilds.get(member.voiceChannel.guild.id)) {
                    msg2.edit("You need to specify a channel or be in one yourself (in this server).").catch(console.error);
                    return;
                }

                // join it
                this.voiceConnection = await member.voiceChannel.join();

                // edit the message letting users know we're connected
                msg2.edit("Connected!").catch(console.error);

            } else {
                // not in a voice, send an error message
                msg2.edit("You need to specify a channel or be in one yourself.").catch(console.error);
            }

            // return because we dont want to continue
            return;
        }

        // function to find the channel
        const filterQuery = function(x) {
            return x.type == "voice" && x.name.toLowerCase() == channelTitle;
        }

        // get the channel
        const channel = this.guild.channels.filter(filterQuery).first();

        // if the channel was not found
        if (!channel) {
            msg.edit(`That voice channel was not found (${channelTitle})`).catch(console.error);
            return;
        }

        // connect and set the voice connection
        this.voiceConnection = await channel.join();
        
        // edit the message letting users know we're connected
        msg.edit("Connected!").catch(console.error);
    }

    disconnect(msg) {
        let t = this;
        if (this.voiceConnection) {
            if (msg) msg.reply("I'm leaving voice now").then((msg) => {
                none(msg);
                t.voiceConnection.channel.leave();
                t.voiceConnection = null;
            }).catch(console.error);;
        } else {
            msg.reply("I'm not in a voice channel!").catch(console.error);
        }
    }

    stop(msg) {
        if (this.dispatcher) {
            this.dispatcher.pause();
            msg.reply("I've paused the music for you.").catch(console.error);
        } else {
            msg.reply("I'm not playing any music.").catch(console.error);
        }
    }

    next(msg) {
        if (!this.dispatcher) {
            msg.reply("I'm not playing any music.").catch(console.error);
            return;
        }

        let t = this;

        if (this.times && this.times.length > 0 && msg.content.startsWith("next")) {
            this.timerCount++;
            let stream = ytdl(this.current.id, {filter:'audioonly'});

            this.dispatcher = this.voiceConnection.playStream(stream, {volume:this.volume, seek:this.times[this.timerCount].time, passes:2});
            this.dispatcher.on("start", () => {
            t.musicChannel.send("Listening to: **" + t.times[t.timerCount].title + "**").catch(console.error);
            });

            this.dispatcher.on("error", (err) => {throw err;});
            this.dispatcher.on("speaking", (speaking) => {
            if (t.times && t.times[t.timerCount] && t.dispatcher.time/1000 >= t.times[t.timerCount].time && !t.dispatcher.paused) {
                // same as other one
                t.musicChannel.send("Listening to: **" + t.times[t.timerCount].title + "**").catch(console.error);
                t.timerCount++;
            }
            });
    
            this.dispatcher.on("end", () => {
            t.dispatcher = null;
            if (t.queue.length > 0) t.playNext();
            else if (t.voiceConnection) {
                t.musicChannel.send("I've finished playing the last song.").catch(console.error);
            }
            });
            return;
        }
        msg.reply("I'll play the next song for you.").catch(console.error);
        this.dispatcher.end();
        
    }

    async play(msg) {
        // check if not in a channel, 
        if (!this.voiceConnection) {
            // join
            await this.joinVC(msg)
            // then play
            return this.play(msg);
        }

        const content = msg.content.substring(4).trim();
        this.musicChannel = msg.channel;

        if (content === "") {
            if (this.dispatcher && this.dispatcher.paused) {
                msg.reply("I'm resuming the music.").then(this.dispatcher.resume).catch(console.error);
            } else {
                msg.reply("You need to send me a link to play").catch(console.error);
            }
            return;
        }

        const items = content.split(",");
        const t = this;
        
        const search = function(thing) {
            youtube.search(thing, 10, (err, result) => {
                for (let i = 0; i < result.items.length; i++) {
                    let item = result.items[i].id;

                    if (item.kind == "youtube#video") {
                        setInfo(item.videoId, result.items[i].snippet.title);
                        return t.addQueue(item.videoId, msg);
                    }
                }

                msg.reply("I could not find a video with that search.").catch(console.error);
            });
        }

        for (let i = 0; i < items.length; i++) {
            let thing = items[i].trim();

            if (thing.indexOf("youtu") === -1) {
                return search(thing);
            }
            
            // look for youtube.com
            if (thing.indexOf("youtube") > 0) {
                thing = thing.split('=')[1].split("&")[0];
            } else {
                // otherwise its youtu.be
                thing = thing.split("/")[3].split("&")[0];
            }
            t.addQueue(thing, msg);
        }
    }

    async playNext() {
        let t = this;

        if (!this.voiceConnection) {
            console.log("playnext() without voiceConnection. " + new Error().stack);
            return;
        }

        this.current = this.nextItem();

        const stream = ytdl(this.current.id, {filter:'audioonly'});
        const info = await getInfo(this.current.id);

        if (info.livestream) {
            this.musicChannel.send("I cannot play livestreams.").catch(console.error);
            return playNext();
        }

        this.timerCount = 0; 
        this.data = [];

        // check for important times
        this.times = await getImportantTimes(this.current.id);

        // setup a stream
        t.dispatcher = this.voiceConnection.playStream(stream, {volume:t.volume, passes:2, seek:0});

        // setup events
        this.dispatcher.on("start", () => {
            makeEmbed("I'm now playing", t.current.title, toUrl(t.current.id), t.musicChannel);
        });
        this.dispatcher.on("error", (err) => {
            throw err;
        });

        this.dispatcher.on("speaking", (speaking) => {
            if (t.times && t.times[t.timerCount] && t.dispatcher.time/1000 >= t.times[t.timerCount].time && !t.dispatcher.paused) {
                //TODO: make like np
                //t.musicChannel.send("Listening to: **" + t.times[t.timerCount].title + "**").catch(console.error);
                t.np({channel:t.musicChannel});
                t.timerCount++;
            }
        });

        this.dispatcher.on("end", () => {
            t.dispatcher = null;
            t.data = [];
            if (t.queue.length > 0) {
                t.playNext();
            } else if (t.voiceConnection) {
                t.musicChannel.send("I've finished playing the last song.").catch(console.error);
            }
        });

    }

    setVolume(msg) {
        let vol = parseInt(msg.content.substring("volume".length).trim());

        if (isNaN(vol)) {
            return msg.reply("The volume is at " + this.volume * 100).catch(console.error);
        }

        this.volume = vol/100;

        if (this.dispatcher) {
            this.dispatcher.setVolumeLogarithmic(this.volume);
        }

        msg.reply("I've set the volume to " + (this.volume * 100)).catch(console.error);
    }

    // queue things
    np(msg) {
        if (!this.current) {
            msg.channel.send("I'm not playing anything right now").catch(console.error);
            return;
        }

        let song = "";
        if (this.times && this.times[this.timerCount-1]) {
            song += "?t=";
            const times1 = fixTime(this.times[this.timerCount-1].time).split(":");
            let c = 0;
            if (this.times.length == 3) {song += times1[c] + "h"; c++;}
            if (times1[c] > 0) song += times1[c] + "m"; c++;
            if (times1[c] > 0) song += times1[c] + "s";
        }
        
        // TODO: just make the embed here >.>
        makeEmbed("Now Playing", this.current.title, toUrl(this.current.id) + song, msg.channel, (this.times && this.times[this.timerCount-1]) ? this.times[this.timerCount-1].title : undefined);
    }


    showQueue(msg) {
        // check if queue is empty
        if (!this.times || this.times.length === 0) {
            return msg.reply("My queue is empty.").catch(console.error);
        }

        const embed = new Discord.RichEmbed();
        let list = "", count = 0;

        // check times for current song
        if (this.times && this.times.length > this.timerCount - 1) {    
            for (let i = this.timerCount - 1; i < this.times.length; i++) {
                // list songs in current time
                list += this.times[i].title + "\n"; // might change to be links at the current time
            }
            embed.addField("Now playing:", list);
        }

        // check all other songs in the queue
        if (this.queue.length > 0) {
            list = "";

            for (let q in this.queue) {
                count++;
                list += `${count}: [${this.queue[q].title}](${toUrl(this.queue[q].id)})\n`;
            }
            embed.addField("Coming up:", list);
        }

        // reply
        msg.channel.send(embed).catch(console.error);
    }


    unQueue(msg) {
        const pos = parseInt(msg.content.substring(7).trim());
        if (isNaN(pos) || this.queue.length < pos) {
            return msg.reply("That is not a valid position.").catch(console.error);
        }

        const removed = queue.splice(pos, this.queue.length);
        msg.reply(removed.title + " was removed from the queue.").catch(console.error);
    }

    async addQueue(id, msg) {
        const t = this;

        const title = await getTitle(id);
        t.queue.push(new QueueItem(id, title));

        // if not playing anything, play something
        if (!t.dispatcher) {
            t.playNext();
        }
        else if (msg) {
            // reply if playing something alredy
            msg.reply("I've added " + title + " to the queue").catch(console.error);
        }
    }

    nextItem() {
        return this.queue.shift();
    }



    // youtube playlist things
    async ytpCommands(msg) {
        msg.content = msg.content.substring(3).trim();
        if (msg.content.startsWith("play")) return this.ytpPlay(msg);
        if (msg.content.startsWith("show")) return this.ytpShow(msg);
    }

    async ytpPlay(msg) {
        const list = await this.ytpShow(msg, "Added the following to the queue:");

        // add all items to the queue
        list.array.forEach(i => {
            this.queue.push(new QueueItem(i.id, i.title));
        });

        if (!t.dispatcher) t.playNext();
    }

    // done
    async ytpShow(msg, extraText) {
        // define the max number of entries, then add one because my code is bad
        let max = 8; max++;

        // define the embed to send
        const embed = new Discord.RichEmbed();

        // get the pid
        let pid = msg.content.substring(4).trim();

        // get the id (fix this to find `list=`, and return smth if there is no list)
        if (pid.indexOf("youtube") > 0) { // youtube.com
          pid = pid.split('=')[1].split("&")[0];
        } else { // youtu.be
          pid = pid.split("/")[3].split("&")[0];
        }

        const msg2 = await msg.channel.send("One moment...").catch(console.error);

        // ================
        // do the thing now
        // ================
        
        // get the list
        const list = await getPlaylist(pid);

        // get the number of entries to list
        const lng = Math.min(max, list.length); 

        // embed text
        let embedText = "";

        // loop through all items
        for (let i = 0; i < lng; i++) {
            embedText += `[${list[i].name}](${toUrl(list[i].id)})\n`;
        }

        // add the text to the embed
        embed.addField("This playlist has:", embedText);

        // add the footer if needed
        if (list.length-lng > 0) embed.setFooter("and " + (list.length-lng) + " more.");
        // add description if needed
        if (extraText) embed.setDescription(extraText);

        // send the embed
        msg2.edit(embed).then(none).catch(console.log);

        // return the list
        return list;
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



// user db things
async function getUser(id) {
    const p = new Promise(async (resolve, reject) => {
        userDb.findOne({_id:id}, async (err, user) => {
            // check for errors
            if (err) reject(err);

            // got a user?
            if (user) {
                // return it
                return resolve(new UserInfo(id, user));
            }

            // no user, create one
            user = new UserInfo(id);
            userDb.insert(user);
            
            // return the user
            resolve(user);
        });
    })
    return await p;
}


function saveUser(userInfo) {
    userDb.update({_id:userInfo._id}, userInfo, (err) => {
        if (err) console.error(err);
    });
}

// utilities

// makes an embed with a masked link
function makeEmbed(desc, text, link, channel, otherText) {
    const embed = new Discord.RichEmbed();
    embed.addField(desc, `[${text}](${link})`);

    otherText = otherText || "";

    if (channel) {
        channel.send(otherText, embed);
    }
    return embed;
}


// setup the bot (might move this to its own file to minimize the mess in this one)
// when the bot is ready
bot.on("ready", () => {
    console.log("Cybel is ready :D");

    // convert author from id to real user
    const eveP = bot.fetchUser(eve);
    eveP.then(user => {
        eve = user;
    });
    eveP.catch(console.error);
    
    // define g to make the function declaration easy
    let g;

    // define the guild initialization function
    const doGuild = function(err, doc) {
        if (err) {
            console.error(err);
            return;
        }

        if (!doc) {
            guildDb.insert(new GuildData(g).getData());
        } else {
            guildData[g.id] = doc;
        } 
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
            if (guildData[guild]) {
                guildDb.update({_id:guild}, guildData[guild].getData());
            }
        }
    }, 1000);

    // setup the bot's visual stuff
    //bot.user.setGame("Flirting with Eve.");
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

    // find the default channel
    let channelID;
    let channels = guild.channels;
    channelLoop:
    for (let c of channels) {
        const channelType = c[1].type;
        if (channelType === "text") {
            channelID = c[0];
            break channelLoop;
        }
    }
    // TODO: save this somewhere
    const channel = bot.channels.get(guild.systemChannelID || channelID);


    // initialize local data
    const g = new GuildData(guild);
    guildData[guild.id] = g;
    guildDb.insert(g.getData());

    // send messages into the guild and to the owner of the guild
    channel.send("Haii! I'm Cybel, pleased to meet you all! I hope we can get along :3").catch(console.error);
    guild.owner.send("Hai! If you would like to know what kind of settings you can change just pm me `settings` and I can give you a list~").catch(console.error);;
});


// when we leave a guild
bot.on("guildDelete", (guild) => {
    // just delete the guild data
    // no need to update the guildDB, it will be updated later
    delete guildData[guild.id];
});

bot.on("message", async (msg) => {
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
    const data = guildData[member.guild.id];
    if (data.showJoinMessages) {
        //TODO: default channel is rip
        member.guild.defaultChannel.send(`${member}, Welcome to ${member.guild.name}!`).catch(console.error);;
    }
});

// when a member leaves
bot.on("guildMemberRemove", (member) => {
    const data = guildData[member.guild.id];
    if (data.showJoinMessages) {
        //TODO: default channel is rip
        member.guild.defaultChannel.send(`${member}, has left the guild`).catch(console.error);;
    }
});

// login to discord
bot.login(keys.discord);


// if theres any other issues, catch them
process.on('uncaughtException', (err) => {
    console.error(err);
    try {
        eve.send(err + "\n" + err.stack).then(none).catch(console.error);
    } catch (err1) {
        console.error(err1);
        process.exit(1);
    }
});