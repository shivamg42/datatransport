/**
*   Description:
*/


var fs = require('fs');
var xlsx = require('node-xlsx');
var jsonfile = require('jsonfile');
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var inputAsJSON = './temp/inputData.json';


/**
*   Description:
*
*/
exports.readXlsx = function (file){
    var rawData = fs.readFileSync(file);
    var rawUnformatted =  xlsx.parse(rawData);
    jsonfile.writeFileSync(inputAsJSON, rawUnformatted, {spaces:2});
    return formatJSON(inputAsJSON);
};

/**
*   Description:
*
*/
function formatJSON(file){
    var rawData = fs.readFileSync(file);
    var json = JSON.parse(rawData);
    var entries = json[0].data.length;
    //  console.log(entries);

    var user = [];
    for(var entry = 1 ; entry < entries ; entry++){
        var eachUser = {};

        eachUser["name"] = json[0].data[entry][1];
        // First part of the email id
        var email = json[0].data[entry][8];
        var username = email.split('@'); //To do .split('@') ;

        eachUser["email"] = email;
        eachUser["username"] = username[0];
        eachUser["roles"] = "authenticated";

        var attributes = [];
        var eachAtribute = {};

        for( var i=0; i< json[0].data[entry].length; i++){
            eachAtribute[json[0].data[0][i]] = json[0].data[entry][i];
        }
        attributes.push(eachAtribute);
        eachUser["attributes"] = attributes;
        user.push(eachUser);
        console.log(user);
        console.log("\n");
        console.log(entry);
    }

    return user;
};


/**
*   Description:
*
*/
exports.updateDatabase = function (data, writeRule){
    var rule = readmapping(writeRule);
    var mapping = [];

    // Working connection
    var database = rule.rule.connection[0].db;
    var collection = rule.rule.connection[0].collection;

    var entry = 'mongodb://' + rule.rule.connection[0].ip_address + ':' +
    rule.rule.connection[0].port + '/' + database ;

    MongoClient.connect(entry, function(err,db) {
        if(err) {
            //console.log(entry);
            throw err;
        }

        savesPending = data.length;

        var saveFinished = function(){
            savesPending--;
            if(savesPending == 0){
                db.close();
            }
        };

        //this.salt = crypto.randomBytes(16).toString('base64');

        var makepassword = function(password) {
            if (!password || !this.salt) return '';
            var salt = new Buffer(this.salt, 'base64');
            //return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
        };

        var counter = 0;
        for(var i=0 ; i<data.length ; i++){
            /* If the email is present or not in the database, update the attributes.
            If email is not present, then insert name, email, username and roles*/
            db.collection(collection).update({ email : data[i].email},
                                {$setOnInsert: { "name"     : data[i].name,
                                                 "email"    : data[i].email,
                                                 "username" : data[i].username,
                                                 "roles"    : "authenticated",
                                                 "salt" :  this.salt,
                                                  //"hashed_password" :makepassword('testestest')
                                               },
                                        $set: {"attributes" : data[i].attributes}},
                                        {upsert:true}, function(err, records) {
              if (err) throw err;

                    saveFinished();

            });
        }

    });
}

/**
*   Description:
*
*/
function readmapping(file){
    var rawData = fs.readFileSync(file);
    var rule = JSON.parse(rawData);
    return rule;
}
