var mongoXlsx = require('mongo-xlsx');

var fs = require('fs');
var xlsx = require('node-xlsx');
var jsonfile = require('jsonfile');
var jsonData = './data.json';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;

var writeRule = 'writingToDB_rule.json';
var inputXlsx = 'EMP Data.xlsx';

function readXlsx(file){
  var rawData = fs.readFileSync(file);
  return xlsx.parse(rawData);
};

function readmapping(file){
      var rawData = fs.readFileSync(file);
      var rule = JSON.parse(rawData);
      return rule;
}

function rawToJSON(raw, json){
  jsonfile.writeFileSync(json, raw, {spaces:2});
};

function formatJSON(file){
  var rawData = fs.readFileSync(file);
  var json = JSON.parse(rawData);
  var entries = json[0].data.length;
//  console.log(entries);

  var user = [];
  for(var entry = 1 ; entry < entries-1 ; entry++){
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
  }
  return user;
};

function addToCollection(data){
    var collection = {};
    var readCollection = readmapping(writeRule);
    var addToCollection = readCollection.rule.connection[0].collection;
    collection[addToCollection] = data;
    return collection;
}

function updateDatabase(data){
  var rule = readmapping(writeRule);
  var mapping = [];

    // Working connection
    var database = rule.rule.connection[0].db;
    var collection = rule.rule.connection[0].collection;

    var entry = 'mongodb://' + rule.rule.connection[0].ip_address + ':' +
                  rule.rule.connection[0].port + '/' + database ;

    MongoClient.connect(entry, function(err,db) {
        if(err) throw err;
        var counter = 0;
        for(var i=0 ; i<data.length ; i++){
            /* If the email is present or not in the database, update the attributes.
            If email is not present, then insert name, email, username and roles*/
            db.collection(collection).update({ email : data[i].email},
                                {$setOnInsert: { "name"     : data[i].name,
                                                 "email"    : data[i].email,
                                                 "username" : data[i].username,
                                                 "roles"    : "authenticated"},
                                        $set: {"attributes" : data[i].attributes}},
                                        {upsert:true}, function(err, records) {
              if (err) throw err;
            });
        }
        db.close();
    });


}
/*
function buildModel(dyModel, mapping){
  var model = [];
  for(var key in mapping[0]){
    var currObj = {};
    for(var j=0 ; j<dyModel.length ; j++){
      if(key == dyModel[j].access){
        currObj["displayName"] = mapping[0][key];
        currObj["access"] = dyModel[j].access;
        currObj["type"] = dyModel[j].type;
        break;
      }
    }
    model.push(currObj);
  }
  return model;
}


function writeToXlsx(data, modelFile ){
    var rawData = fs.readFileSync(modelFile);
    var mapping = JSON.parse(rawData);
    var dyModel = mongoXlsx.buildDynamicModel(data);

    var model = buildModel(dyModel, mapping);

  mongoXlsx.mongoData2Xlsx(data, model, function(err, data) {
    console.log('File saved at:', data.fullPath);
  });
};
*/
/* Not yet completly implemented */
/*function readDataBase(){
  MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err,db) {
      db.collection('test', function(err, collection){
        collection.find().toArray(function(err, items) {
          if(err) throw err;
          db.close();
          writeToXlsx(items, 'mapping.json');
      });
    });
  });
}
*/

/* Not yet completly implemented */
/*
function readmapping(file){
      var rawData = fs.readFileSync(file);
      var rule = JSON.parse(rawData);
      var mapping = [];
      for(var query in rule.rule.db[0]){
        var details = query.split('/');
        console.log(details[0]);
        // Working connection
        var entry1 = 'mongodb://' + rule.rule.connection[0].ip_address + ':' +
                      rule.rule.connection[0].port + '/' + details[0] ;
        console.log(entry1);
        MongoClient.connect(entry1, function(err,db) {
            if(err) throw err;
            console.log("Success");

            db.collection('details[0]', function(err, collection){
              collection.find().toArray(function(err, items) {
                if(err) throw err;
                db.close();
            });
          });
//          db.close();
        });
      }
}
*/
/* All the functions are just to write to database */
var rawData = readXlsx(inputXlsx);
rawToJSON(rawData, 'data.json');
var jsonData = formatJSON('data.json');
updateDatabase(jsonData);
