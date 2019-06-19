// requires
const keys = require("../keys.json");
const parseString = require('xml2js').parseString;

function animeSearch(msg) {
    const username = keys.malUsername;
    const password = keys.malPassword;

    if (!username || !password) {
        msg.reply2("this bot does not support anime searches :c");
        return;
    }

    const anime = msg.content.substring(5).trim().split(" ").join("+");
    const url = `https://myanimelist.net/api/anime/search.xml?q=${anime}`;
    const auth = "Basic " + new Buffer(username + ":" + password).toString("base64");

    // do the request
    request({url:url, headers:{"Authorization":auth}}, (error, response, body) => {
      // check status codes
      if (response.statusCode === 204) return msg.channel.sendMessage2("I could not find that anime, sorry.");
      if (response.statusCode !== 200) return console.error(response.statusCode);

        parseString(body, (err, res) => {
            const _anime = res.anime.entry[0];
            const synopsis = _anime.synopsis[0].split(".");
            const d = ".";
            const _synopsis = decodeURI(synopsis[0] +d+ synopsis[1] +d+ synopsis[2]);
            const str = `${_anime.english[0]} (${_anime.title[0]}): ${_anime.episodes[0]} episodes (${_anime.score[0]}*s), ${_anime.status[0]}\`\`\`${_synopsis}...\`\`\`${_anime.image[0]}`;
          
            // send all 
            msg.channel.sendMessage(str).catch(console.error);
        });
    });
}

module.exports = {
    animeSearch : animeSearch
};