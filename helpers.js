// requires:

// prototype modifications

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

                // if we do, no point in continuing the search, return 
                return true;
            }
        }
    }

    return (this.indexOf(str) !== -1);
};
  
// get a random index from the array
Object.defineProperty(Array.prototype, "randomIndex", function() {
    return this[Math.floor(Math.random()*this.length)];
});

// override
// error helper, this is called whenever there is an error
/*
console.error = function(err) {
    //if (err.message.contains("promise")) return;
    console.log("Error: "+  err);
};

// */


// functions
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

function parseBool(str) {
    str = str.toLowerCase();
    const t = parseInt2(str);

    if (!isNaN(t) && (t === 1 || t === 0)) return t;
    if (str.contains("true") || str.contains("on")) return 1;
    if (str.contains("false") || str.contains("off")) return 0;
    return NaN;
}

// helper for promises when we dont need to do anything after
function none() {
}



module.exports = {
    parseInt2 : parseInt2, 
    fixTime : fixTime,
    parseBool : parseBool,
    none : none
}