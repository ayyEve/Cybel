// requires
const request = require('request');
const Discord = require('discord.js');

// vars
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
   "Very doubtful"
];


// functions

// story command
function story(msg) {
    request("http://www.fmylife.com/random", (error, response, body) => {
        if (error) {
           console.log(error);
           msg.reply2("an error occurred, sorry");
        }
        const d = body.split("data-text="), out = [];

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
  
// roll command
function roll(msg) {
    // look for a number after roll command
    const max = parseInt(msg.content.split(" ")[1].length) || 100;
    
    // reply with the result
    msg.reply(`rolled ${Math.ceil(Math.random() * max)}/${max}`).catch(console.error);;
}

// eight ball command
function eightBall(msg) {
    msg.reply(eightBallMessages.randomIndex()).catch(console.error);;
}

// heads or tails command
function headsTails(msg) {
    msg.reply("I flipped you " + ["Heads", "Tails"].randomIndex()).catch(console.error);;
}

// get all users we are serving (i think?)
function info(msg) {
    let users = 0;
    let ul = "";

    // get all the guilds
    const a = msg.user.guilds.array();

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
  
    const embed = new Discord.RichEmbed();
    embed.setColor(0);
    embed.setAuthor(bot.user.username, bot.user.avatarURL);
    embed.setDescription(`\nHai! My name is ${bot.user.username}\n[Invite me](https://discordapp.com/oauth2/authorize?client_id=248305269858107402&scope=bot&permissions=8)`);

    // embed.addField('Help Command', p+'help', true);
    embed.addField('Servers', bot.guilds.size, true);
    embed.addField('Users', users, true);
    embed.addField('Author', '[Eve](https://osu.ppy.sh/u/5013564)', true);
    embed.addField('Source', '[Github](https://github.com/ayyEve/Cybel)', true);
    msg.channel.sendMessage(embed).then(none).catch(console.err);
}

// when someone asks for help
function help(p) {
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


module.exports = {
   story : story,
   roll : roll, 
   eightBall : eightBall,
   headsTails : headsTails,
   info: info,
   help : help
};