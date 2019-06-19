// requires
const keys = require("../keys.json");
const Osu  = require('osu-api');
const Discord = require("discord.js");

// check key
let osu;
if (keys.osu) {
    console.log("osu key found, loading osu module..");
    osu = new Osu.Api(keys.osu);
} else {
    console.log("osu key not found, skipping");
}



// functions
function setMode(msg) {
  osu.setMode(Osu.Modes.osu);
  if (msg.content.contains("taiko")) return osu.setMode(Osu.Modes.taiko);
  if (msg.content.contains("mania")) return osu.setMode(Osu.Modes.osumania);
  if (msg.content.contains("ctb")) return osu.setMode(Osu.Modes.CtB);
  return 1;
}

function osuCommands(msg) {
  if (!keys.osu) {
      msg.reply("osu is not enabled on this bot, sorry :c");
      return;
  }

  msg.content = msg.content.substring(3).trim();

  if (!setMode(msg)) {
      msg.content = msg.content.split(" ");
      msg.content.splice(-1);
      msg.content = msg.content.join(" ");
  }

  if (msg.content.startsWith("set"))      return setUsername(msg);
  if (msg.content.startsWith("topranks")) return topRanks(msg);
  if (msg.content.startsWith("userinfo")) return userInfo(msg);
}

function setUsername(msg) {
    msg.content = msg.content.substring(3).trim();
    getUser(msg.author.id, (user) => {
        if (user.osu) {
            msg.reply("I'm changing your username from `" + user.osu + "` to `" + msg.content + "`.").catch(console.error);
        } else {
            msg.reply("I'm setting your username to `" + msg.content + "`.").catch(console.error);
        }
        user.osu = msg.content;
        user.save();
    });
}

function topRanks(msg) {
    function get(user) {
        osu.getUserBest(user, (err, list) => {
            const embed = new Discord.RichEmbed();
            let count = 0;

            function go() {
                if (count < list.length) {
                  getMapTitle(list[count]).then((title) => {
                      //TODO: make nicer and make sure its /b/, also mods
                      // let mod = Osu.mods.get(list[count].mods);
                      embed.addField(count + ": " + list[count].pp + "pp (" + list[count].rank + ")", `[${title}](https://osu.ppy.sh/b/${list[count].beatmap_id})`);
                      go();
                      count++;
                  });
                } else {
                    msg.reply(embed);
                }
            }
            go();
        });
    }

    const u = msg.content.substring(7).trim();
    if (u) {
       return get(u);
    }

    getUser(msg.author.id, (info) => {
        if (info.osu) {
            get(info.osu);
        } else {
            msg.reply("You must either specify a username, or set yours with -osu set [your username].").catch(console.error);
        }     
    });
}

function userInfo(msg) {
    function get(user) {
        osu.getUser(user, (err, data) => {
            let out = "";
            out += data.username + " level " + data.level + "(played " + data.playcount + "times)\n";
            out += "rank " + data.pp_rank + " (" + data.pp_country_rank + ")\n";
            out += "ranked score: " + data.ranked_score + "(" + data.total_score + " total)";
            msg.channel.send(out).catch(console.error);
        });
    }

    const u = msg.content.substring(8).trim();
    if (u) {
        return get(u);
    }

    getUser(msg.author.id, (info) => {
        if (info.osu) {
            get(info.osu);
        } else {
            msg.reply("You must either specify a username, or set yours with -osu set [your username].").catch(console.error);
        }
    });
}

async function getMapTitle(id) {
    return new Promise((resolve, reject) => {
        osu.getBeatmap(id, (err, map) => {
            if (err) {
                reject(err);
            } else {
                resolve(map);
            }
        });
    });
}



module.exports = {osuCommands: osuCommands};
