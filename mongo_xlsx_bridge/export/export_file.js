var fs = require('fs');
var qs = require('mongo-querystring');
var querystring = require('querystring');
var q2m = require('query-to-mongo');
var myFilter = require('../parser/parseText');

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
  var rows = 100;
  var currColumn = 0;
  // To-do : Fix the number of rows
  var sheet1 = workbook.createSheet('sheet1', columns, rows);

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
            // If the filter is not right and data is null, catch exception.
            try{
                for(var row=0; row<data.length; row++){
                    var string = JSON.stringify(data[row]);
                    string = string.replace(/["\{\}\[\]\']/g, '');
                    var checkString = string.split(":");

                    // It gets messy if there are more then one column that needs to be displayed,
                    // and one of them is part of attributes.
                    if(checkString.length == 2){
                        if(data[row].length > 1){
                            for(var entry=0; entry<data[row].length; entry++){
                                var string = JSON.stringify(data[row][entry]);
                                string = string.replace(/["\{\}\[\]\']/g, '');
                                var checkString = string.split(":");
                                if(checkString.length == 2){
                                    string = checkString[1];
                                }
                                string = string.replace(/[\']/g,'');
                                if(entry > 0){
                                    finalString += ',' + string;
                                }
                                else{
                                    finalString = string;
                                }
                            }
                            string = finalString;
                        }
                        else{
                            string = checkString[1];
                            string = string.replace(/[\']/g,'');
                        }
                    }

                    // +2 beacause  row stats with 0. Row 1 has column header
                    sheet1.set(currColumn,row+2, string);
                }
            }catch(err){
                console.log("Exception while creating excel. " + columnName + " data is null" + err);
                console.log(output);
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
    var givenMap = {};
    var queryMap = {};
    var expRule = fs.readFileSync(file);
    var export_rule = JSON.parse(expRule);

    var details;
    var dbs = {};
    var output = [];
    var index = 0;
    // Get the dbs and collections in JSON format
    getDBs(export_rule, dbs);
    //console.log(JSON.stringify(export_rule.rule.db[0]));
    for(var each in export_rule.rule.db[0]){
        givenMap[each] = export_rule.rule.db[0][each];
    }
    //console.log(givenMap);

    var openDatabases =  Object.keys(dbs).length;
//    console.log(JSON.stringify(dbs));

    for(var eachDB in dbs){
        /* Connection rule: [0] - username, [1] - key, [2] - ip , [3] - port number. */
        try{
            var connectRule = 'mongodb://' + export_rule.rule.connection[0][eachDB][2]+ ':' +
                          export_rule.rule.connection[0][eachDB][3] + '/' + eachDB;

                var allDatabaseClosed = function(){
                    openDatabases--;
                    if(openDatabases == 0){
                        console.log("All database closed. Creating Excel");
                        // console.log(JSON.stringify(output));
                        createExcel(output, dbs);
                        return;
                    }
                };
        }catch(err){
            console.log("Error connecting to database. Check the rule file.");
            continue;
        }

        MongoClient.connect(connectRule, function(err,db) {
            if(err){
                console.log("Error in connecting to database: " + thisDatabase);
                return;
            }

            var thisDatabase = db.s.databaseName;
            console.log("Conected to " + thisDatabase);

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
                    console.log("Closing " + thisDatabase);
                    allDatabaseClosed();
                }
            };

            //In this connected database, go to each collection.
            for(var eachCollection in dbs[thisDatabase][0]){
                var currCollection = eachCollection;
                db.collection(currCollection, function(err, collection){
                    if(err){
                        console.log("Error in collection");
                        return;
                    }

                    var numOfPropInThisCol = dbs[thisDatabase][0][currCollection].length;
                    for(var eachProperty = 0; eachProperty <  numOfPropInThisCol ; eachProperty++){
                        var currProperty = dbs[thisDatabase][0][currCollection][eachProperty].property; // 0 - property, 1 -filter
                        var currFilter = dbs[thisDatabase][0][currCollection][eachProperty].filter;
                        //console.log(thisDatabase + " " + currCollection +  " " + currProperty + " " + currFilter);
                        var currQueryMap = thisDatabase + "/" + currCollection +  "/" + currProperty + "/" + currFilter;

                        var displayItem = {};
                        displayItem[currProperty] = 1;  // Sets the field to display
                        displayItem["_id"] = 0;         // Do not display the __ids

                        // Display the whole column if the filter is empty
                        if(currFilter == "empty"){
                            currFilter = '';
                        }

                        var myQuery = myFilter.parseText(currFilter);
                        // console.log(JSON.stringify(myQuery));
                        // console.log('\n');
                        queryMap[myQuery] = currQueryMap;

                        currFilter = currFilter + "&fields=" + currProperty;
                        var query = currFilter;
                        var q = q2m(querystring.parse(query));
                        q.options.fields["_id"] = false;

                        // console.log(q.options.fields);
                        // console.log('\n');
                        // console.log(JSON.stringify(q.criteria));

                        collection.find(myQuery, q.options.fields, function(err, resultCursor) {
                            var outputObj = {};
                            var formattedData = [];

                            var thisFilter = resultCursor.cursorState.cmd.query;
                            var currProperty = resultCursor.cursorState.cmd.fields;
                            //var thisColumn = getColumn(export_rule, thisDatabase, currCollection, currProperty, thisFilter);

                            var thisColumnInter = queryMap[thisFilter];
                            var thisColumn = givenMap[thisColumnInter];

                            //console.log("column name is : " + thisColumn);
                            // Reference from stackoverflow: https://goo.gl/ROAaxU
                            resultCursor.nextObject(function fn(err, item) {
                                if (err){
                                    console.log("error reading cursor" + resultCursor);
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
                                var interm = [];
                                for(each in items){
                                    interm.push(items[each]);
                                }
                                formattedData.push(interm);
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
function getColumn(exRule, thisDatabase, currCollection, currProperty, currFilter){

    var getAllProp = "";
    var getAllFilter = "";
    var path;
    console.log(currFilter);
    //Get property
    for(var each in currProperty){
        if(each != "_id"){
            if(getAllProp != ""){
                getAllProp += ",";
            }
            getAllProp += "" + each ;
        }
    }
    //console.log(JSON.stringify(currFilter));

    //Get filter
    if(Object.keys(currFilter).length === 0){
        getAllFilter = "empty";
    }
    else{
        for(var each in currFilter){
            if(getAllFilter != ""){
                getAllFilter += ",";
            }
            var first = 1;
            // Object is when there are arithmetic or logical operators (and, or, >, <)
            if(typeof(currFilter[each]) == 'object')
            {
                 for(var eachFilter in currFilter[each]){
                    if(first == 1){
                        getAllFilter += "" + each;
                        first = 0;
                    }
                    else{
                        getAllFilter += "&" + each;
                    }
                    getAllFilter += getSymbolMapping(eachFilter)+ ""+ currFilter[each][eachFilter];
                }
            }
            else{
                getAllFilter += "" + each + "=" + currFilter[each];
            }
        }
    }

    path = thisDatabase + "/" + currCollection + "/" + getAllProp + "/" + getAllFilter;
    return exRule.rule.db[0][path];
}


function getSymbolMapping(text){
    if(text == "$gt")
        return ">";

    if(text == "$lt")
        return "<";

}
