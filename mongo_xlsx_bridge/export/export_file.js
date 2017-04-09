var fs = require('fs');
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var excelbuilder = require('msexcel-builder');

function getDBs(exRule, dbs){
    var numOfEntries = Object.keys(exRule.rule.db[0]).length;
    var currDB = 0;
    var prevCollection = 0;
    var collections = {};
    var properties = [];
    var allCollections =[];
    var allProperties = [];

     //process each line in the rule file
    for(var eachLine in exRule.rule.db[0]){

        details = eachLine.split('/');
        var database = details[0];
        var collection = details[1];
        var property =  details[2];
        var filter = details[3];
        var columnName = exRule.rule.db[0][eachLine];

        properties = {};
        allProperties = [];

        allCollections = [];
        collections = {};
        properties["property"] = property;
        properties["filer"] = filter;
        properties["columnName"] = columnName;

        allProperties.push(properties);
        collections[collection] = allProperties;
        allCollections.push(collections);

        // If the database is already in the rule file
        if(dbs[database] == null){
            dbs[database] = allCollections;
        }else{
            // If the collection doesnot exist
            if(dbs[database][0][collection] == null){
                dbs[database][0][collection] = allProperties;
            }
            else{
                dbs[database][0][collection].push(properties);
            }
        }
    }
}

function createExcel(output){
    // Create a new workbook file in current working-path
  var workbook = excelbuilder.createWorkbook('./output/', 'sample.xlsx')
  var columns = output.length;

  var sheet1 = workbook.createSheet('sheet1', 100, 100);
  console.log(output.length);
    for(var i=0; i<columns; i++){
        for(each in output[i]){
            sheet1.set(i+1, 1, each.toString());
            for(var j=0 ; j<output[i][each].length; j++){
                sheet1.set(i+1, j+2, JSON.stringify(output[i][each][j]));
            }
        }
    }

  // Check this. This is returning not ok
  workbook.save(function(ok){
    if (!ok){
      workbook.cancel();
    }
    else
      console.log('congratulations, your workbook created');
    });

}



exports.exportToExcel = function(file){

    var expRule = fs.readFileSync(file);
    var export_rule = JSON.parse(expRule);

    var details;
    var dbs = {};
    var output = [];
    var index = 0;
    // Get the dbs and collections in JSON format
    getDBs(export_rule, dbs);
//    console.log(dbs.db1);
    var openDatabases =  Object.keys(dbs).length;

    for(var eachDB in dbs){
        var connectRule = 'mongodb://' + export_rule.rule.connection[0].ip_address + ':' +
                      export_rule.rule.connection[0].port + '/' + eachDB ;

            var allDatabaseClosed = function(){
                openDatabases--;
                if(openDatabases == 0){
                    console.log(output);
                    createExcel(output);
                }
            };

        MongoClient.connect(connectRule, function(err,db) {
            var thisDatabase = db.s.databaseName;
            if(err){
                console.log("Error in connecting to database: " + thisDatabase);
                throw err;
            }

            var savesPending = 0;
            savesPending = Object.keys(dbs[thisDatabase][0]).length;
            for(var i=0; i< Object.keys(dbs[thisDatabase][0]).length ; i++){
                for(var eachCollection in dbs[thisDatabase][i]){
                    savesPending += dbs[thisDatabase][i][eachCollection].length - 1;
                }
            }
            var saveFinished = function(){
                savesPending--;
                if(savesPending == 0){
                    db.close();
                    allDatabaseClosed();
                }
            };
            //In this connected database, go to each collection.

            for(var i=0; i<dbs[thisDatabase].length ; i++){
                for(var eachCollection in dbs[thisDatabase][0]){
                    var currCollection = eachCollection;
                    db.collection(currCollection, function(err, collection){
                        if(err){
                            console.log("Error in collection");
                            throw err;
                        }

                        var numOfPropInThisCol = dbs[thisDatabase][i][currCollection].length;
                        for(var eachProperty = 0; eachProperty <  numOfPropInThisCol ; eachProperty++){
                            var currProperty = dbs[thisDatabase][i][currCollection][eachProperty].property; // 0 - property, 1 -filter
                            //console.log(thisDatabase + " " + currCollection +  " " + currProperty);
                            var displayItem = {};
                            displayItem[currProperty] = 1; // Sets the field to display
                            displayItem["_id"] = 0;

                            // Use the first argument of find fuction for filters.
                            // Use the second argument to get the list to be displayed.
                            collection.find({},displayItem).toArray(function(err, items) {
                                if(err){
                                    console.log("Error in find");
                                    throw err;
                                }
                                // Get the name of this property
                                var thisProperty = Object.keys(items[0])[0];
                                // Fix this.
                                var thisPropertyForCol = Object.keys(items[0])[0];
                                //console.log(thisDatabase + "/" + collection.s.name + "/" + thisProperty );

                                var currCollection = collection.s.name ;
                                var thisColumn;

                                // return from call back items shows the fileds with just as attributes.
                                // Extract the nested document key.
                                // Need to check for multiple nested objects
                                if(thisPropertyForCol   == "attributes"){
                                    var doc = items[0][Object.keys(items[0])[0]];

                                    // Chec if the whole attriutes are queried or a specific field
                                    if(Object.keys(doc[0]).length == 1)
                                        thisPropertyForCol  = thisPropertyForCol  + "." + Object.keys(doc[0])[0];
                                }
                                //Get the column name corresponding to thisProperty.
                                for(var line=0 ; line< dbs[thisDatabase][0][currCollection].length ;line++){
                                    if(thisPropertyForCol  == dbs[thisDatabase][0][currCollection][line].property){
                                        thisColumn = dbs[thisDatabase][0][currCollection][line].columnName;
                                        break;
                                    }
                                }

                                // Create a JSON like data whose format is
                                // { columnName : data_correspond_to_it }
                                var formattedData = [];
                                var outputObj = {};
                                for(var i=0; i<items.length ; i++){
                                     formattedData.push(items[i][thisProperty]);
                                }

                                outputObj[thisColumn] = formattedData ;
                                output.push(outputObj);
                                saveFinished();
                            });
                        }
                    });
                }
            }
        });
    }
}
