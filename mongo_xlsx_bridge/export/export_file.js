var fs = require('fs');
var qs = require('mongo-querystring');
var querystring = require('querystring')
var q2m = require('query-to-mongo')

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
        properties["filter"] = filter;
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

function createExcel(output, dbs){
    // Create a new workbook file in current working-path
  var workbook = excelbuilder.createWorkbook('./output/', 'sample.xlsx')
  var columns = output.length;

  var currColumn = 0;
  // To-do : Fix the number of rows
  var sheet1 = workbook.createSheet('sheet1', 100, columns);

    // For each database in db
    for(var eachDB in dbs){
        // Every collection inside databse
        for(var eachColl in dbs[eachDB][0]){
            var columnName = dbs[eachDB][0][eachColl][0]["columnName"];
            var data;
            for(var count = 0 ; count<output.length; count++){
                data = output[count][columnName];
                if(data != null)
                    break
            }
            ++currColumn;
            sheet1.set(currColumn, 1, columnName);

            for(var row=0; row<data.length; row++){
                var string = JSON.stringify(data[row]);
                string = string.replace(/["\{\}\[\]\']/g, '');
                var checkString = string.split(":");
                if(checkString.length == 2){
                    string = checkString[1];
                    string = string.replace(/[\']/g,'');
                }
                // +2 beacause  row stats with 0. Row 1 has column header
                sheet1.set(currColumn,row+2, string);
            }
        }

    }
  // Check this. This is returning not ok
    workbook.save(function(ok){
        if (!ok){
          workbook.cancel();
        }
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
                    //console.log(output);
                    createExcel(output, dbs);
                    return;
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
            for(var eachCollection in dbs[thisDatabase][0]){
                var currCollection = eachCollection;
                db.collection(currCollection, function(err, collection){
                    if(err){
                        console.log("Error in collection");
                        throw err;
                    }

                    var numOfPropInThisCol = dbs[thisDatabase][0][currCollection].length;
                    for(var eachProperty = 0; eachProperty <  numOfPropInThisCol ; eachProperty++){
                        var currProperty = dbs[thisDatabase][0][currCollection][eachProperty].property; // 0 - property, 1 -filter
                        var currFilter = dbs[thisDatabase][0][currCollection][eachProperty].filter;
                        //console.log(thisDatabase + " " + currCollection +  " " + currProperty + " " + currFilter);

                        var displayItem = {};
                        displayItem[currProperty] = 1;  // Sets the field to display
                        displayItem["_id"] = 0;         // Do not display the __ids

                        // Display the whole column if the filter is empty
                        if(currFilter == "empty"){
                            currFilter = "";
                        }

                        currFilter = currProperty + "" + currFilter;
                        currFilter = currFilter + "&fields=" + currProperty;

                        var query = currFilter;
                        var q = q2m(querystring.parse(query));
                        collection.find(q.criteria,displayItem, function(err, resultCursor) {
                            currFilter = resultCursor.cursorState.cmd.query;
                            currProperty = resultCursor.cursorState.cmd.fields;

                            currProperty  = Object.keys(currProperty)[0];
                            var outputObj = {};
                            var formattedData = [];
                            var thisColumn = getColumn(dbs, thisDatabase, currCollection, currProperty);

                            // Reference from stackoverflow: https://goo.gl/ROAaxU
                            resultCursor.nextObject(function fn(err, item) {

                                if (err){
                                    console.log("error");
                                    return;
                                }
                                else if(!item) {
                                    // Done with all objects
                                    outputObj[thisColumn] = formattedData ;
                                    output.push(outputObj);
                                    saveFinished();
                                    return;
                                }
                                setImmediate(fnAction, item, function() {
                                    resultCursor.nextObject(fn);
                                });
                            });

                            function fnAction(items, callback) {
                                for(each in items){
                                     formattedData.push(items[each]);
                                }
                                // Check for large data if stackoverflows
                                return callback();
                            }
                        });
                    }
                });
            }
        });
    }
}

//Get the column name corresponding to thisProperty.
function getColumn(dbs, thisDatabase, currCollection, currProperty){
    var thisColumn;
    for(var line=0 ; line< dbs[thisDatabase][0][currCollection].length ;line++){
        if(currProperty == dbs[thisDatabase][0][currCollection][line].property){
            thisColumn = dbs[thisDatabase][0][currCollection][line].columnName;
            return thisColumn;
        }
    }
}
