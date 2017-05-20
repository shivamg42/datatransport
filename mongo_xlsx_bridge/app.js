/* Entry point file*/


var imp = require('./import/import_file');
var exp = require('./export/export_file');
var filter = require('./parser/parseText');

/*  Comment / uncomment the following to import to database. Modify the input file name and
    the rule file to add to a partilcular database or collection.
*/
/****************  Import *************************/
/*
var ruleToImport = './import/import_rule.json';
var inputXlsx = './input/input_db3_col3.xlsx'
var jsonData = imp.readXlsx(inputXlsx);
imp.updateDatabase(jsonData, ruleToImport);
*/
/**************** end of Import *****************/


/**
* Rules for export rule file
*   -following are leagal rule files
        1. a>b&c<d,a>=b&c<=d, a!=b|c=d and other varients
        2. {a>b&c<d}&{e=f|g>h} and other varients of this. The logical operators
           between the brackets has to be same.
                    Ex: {}&{}&{}&{}..., {}|{}|{}|{}..
        3. No spacing has to be provided except for fields that has spaces.
            Ex: 'attributes.Position Number' has space between Position and Number.
            So, the following rule is legal
                attributes.Position Number!=1460000
*/
//Uncomment the following to export from database to excel
/**************** Export ***********************/

var ruleToExport = './export/export_rule.json';
exp.exportToExcel(ruleToExport);

/**************** End of export ****************/
