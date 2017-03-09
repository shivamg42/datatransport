var mongoXlsx = require('mongo-xlsx');

var fs = require('fs');
var xlsx = require('node-xlsx');
var jsonfile = require('jsonfile');
var jsonData = './data.json';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;

function readXlsx(file){
  var rawData = fs.readFileSync(file);
  return xlsx.parse(rawData);
};

function rawToJSON(raw, json){
  jsonfile.writeFileSync(json, raw, {spaces:2});
};

function formatJSON(file){
  var rawData = fs.readFileSync(file);
  var json = JSON.parse(rawData);
  var entries = json[0].data.length;

  console.log(entries);
  var user = [];
  for(var entry = 1 ; entry < entries ; entry++){
      var eachUser = {};
      eachUser["Email"] = json[0].data[entry][0];
      eachUser["Name"] = json[0].data[entry][1] + " " + json[0].data[entry][2];;
      var attributes = [];
      for( var i=0; i< json[0].data[entry].length; i++){
          var eachAtribute = {};
          eachAtribute[json[0].data[0][i]] = json[0].data[entry][i];
          attributes.push(eachAtribute);
      }
      eachUser["Attributes"] = attributes;
      user.push(eachUser);
  }
  //  var myJSON = JSON.parse(user);
  //var myJSON = JSON.stringify(user);
  //console.log(user);
  return user;
};

function updateDatabase(data){
  MongoClient.connect('mongodb://127.0.0.1:27017/test', function(err,db) {
      if (err) throw err;
      console.log("Connected to Database");

      //db.collection('test').drop();
      // insert record
      for(var i=0 ; i<data.length ; i++){
        db.collection('test').update({Email : data[i].Email}, data[i], {upsert:true}, function(err, records) {
            if (err) throw err;
            console.log("New Record added");
        });
      }
      db.close();
  });
};

function writeToXlsx(data){
  /* Generate automatic model for processing (A static model should be used) */
  var model = mongoXlsx.buildDynamicModel(data[0].Attributes);
  console.log(data[0].Attributes);
  console.log(model);
  /* Generate Excel */
  mongoXlsx.mongoData2Xlsx(data, model, function(err, data) {
    console.log('File saved at:', data.fullPath);
  });
};

var rawData = readXlsx('employee.xlsx');
rawToJSON(rawData, 'data.json');
var jsonData = formatJSON('data.json');
console.log(jsonData);
updateDatabase(jsonData);
//writeToXlsx(jsonData);
