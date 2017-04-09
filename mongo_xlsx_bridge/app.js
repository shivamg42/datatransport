/* Entry point file*/

/*
Issues:
Keerthi:
1. Works only for one nested database. Exampele,
    "db1/col1/attributes.ID#/empty". Doesnot work for attributes.ID#.xxx.xxx
2. Excel colums are not in order of the rule file.
3. If some thing fails, everything fails. Need to fix the thow of exceptions to
   handle this.
4. Need to add filters.
5. Need to add discriptions and comments to functions.

Hongbo: Please report issues that you see.

*/

var imp = require('./import/import_file');
var exp = require('./export/export_file');

/*  Comment / uncomment the following to import to database. Modify the input file name and
    the rule file to add to a partilcular database or collection.
*/
/****************  Import *************************/

var ruleToImport = './import/import_rule.json';
var inputXlsx = './input/input_db3_col3.xlsx'
var jsonData = imp.readXlsx(inputXlsx);
imp.updateDatabase(jsonData, ruleToImport);

/**************** end of Import *****************/




//Uncomment the following to export from database to excel
/**************** Export ***********************/

var ruleToExport = './export/export_rule.json';
exp.exportToExcel(ruleToExport);

/**************** End of export ****************/
