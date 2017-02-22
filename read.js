var fs = require('fs');
var jsonfile = require('jsonfile');
var parseXlsx = require('excel');
var xlsx = require('node-xlsx');
var path = require('path');

var file = './data.json';
var obj = {name:'jp'};

jsonfile.writeFileSync(file, obj, {spaces:2});

var readMe = fs.readFile('data.xlsx', function(err, rawData){
  var data = xlsx.parse(rawData);
  console.log(rawData);
  console.log(data);
  jsonfile.writeFileSync(file, data, {spaces:2});
});

parseXlsx('data.xlsx', function(err, data){
   //var xlsData = xlsx.parse(data);
  //console.log(xlsData);
//  jsonfile.writeFileSync(file, data, {spaces:2});
//  console.log(data);
});



/*
var readMe = fs.readFile('readMe.txt', 'utf8', function(err, data){
  console.log('read complete');
  fs.writeFile('out.txt', data);

});
console.log('test');
*/
