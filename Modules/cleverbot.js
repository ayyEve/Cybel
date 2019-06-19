
// requires
const Cleverbot = require('cleverbot-node');
const cleverbot = new Cleverbot();

// when the bot is mentioned
function ask(msg) {
    const c = msg.content;
  
    if (c.contains(["your", "name", "like"])) return msg.reply2("I like my name too.");
    if (c.contains(["your", "name"]))         return msg.reply2("My name is " + bot.user.username + ".");
    if (c.contains(["your", "hobbies"]))      return msg.reply2("I like playing video games! ");
  
    msg.channel.startTyping();
    Cleverbot.prepare(() => {
        cleverbot.write(msg.cleanContent.replace(msg.client.user.username, "").trim(), (response) => {
            msg.reply(response.message);
            msg.channel.stopTyping();
        });
    });
}

module.exports = {ask: ask};