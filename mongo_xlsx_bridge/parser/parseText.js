'use strict';
var MongoClient = require('mongodb').MongoClient, format = require('util').format;
var express = require('express');


exports.parseText = function(text){
    var filters = parseExpr(text);
    return filters;
}

var parseGreaterThan = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};

    var symbol = '$gt';
    innerObj[symbol] = Number(rhs);
    outerObj[lhs] = innerObj;
    return outerObj
}


var parseGreaterThanEqual = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};
    var symbol = '$gte';
    innerObj[symbol] = Number(rhs);
    outerObj[lhs] = innerObj;
    return outerObj
}

var parseLessThan = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};
    var symbol = '$lt';
    innerObj[symbol] = Number(rhs);
    outerObj[lhs] = innerObj;
    return outerObj
}

var parseLessThanEqual = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};
    var symbol = '$lte';
    innerObj[symbol] = Number(rhs);
    outerObj[lhs] = innerObj;
    return outerObj
}

var parseEqual = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};
    var symbol = '$eq';
    var numRHS = Number(rhs);
    if(isNaN(numRHS)){
        innerObj[symbol] = rhs;
    }
    else{
        innerObj[symbol] = numRHS;
    }
    outerObj[lhs] = innerObj;
    return outerObj
}


var parseNotEqual = function(lhs, rhs){
    var innerObj = {};
    var outerObj = {};
    var symbol = '$ne';
    var numRHS = Number(rhs);
    if(isNaN(numRHS)){
        innerObj[symbol] = rhs;
    }
    else{
        innerObj[symbol] = numRHS;
    }
    outerObj[lhs] = innerObj;
    return outerObj
}

var parseAND = function(exp){
    var innerObj = [];
    var outerObj = {};
    var symbol = '$and';
    outerObj[symbol] = exp;
    return outerObj
}


var parseOR = function(exp){
    var innerObj = [];
    var outerObj = {};
    var symbol = '$or';
    outerObj[symbol] = exp;
    return outerObj
}

var checkForBrackets = function(exp){
    if( exp.includes("{")  || exp.includes("}")){
        return true;
    }
    return false;
}

var parseExpr = function(exp){
    var operatorsBwBraces = [];

    if(exp === ""){
        // If there is no filter, return empty object
        return {};
    }

    // Make sure that if the text has spaces, we don't over write them.
    // Some of the fields like "Position Number" has spaces. Avoid replacing
    // those spaces.
    if(!exp.includes(" "))
        exp = exp.replace(/ /g,'');

    // Handle expressions with brackets and without brackets seperately
    if(checkForBrackets(exp)){
        // get the exp within {} brackets
        var results = [], re = /{([^}]+)}/g, text;
        var index = -1;
        // Ger all the exressions if there are multiple brackets
        while(text = re.exec(exp)) {
            results.push(text[1]);
            // Get the logical operator between brackets. Ex: {}&{}, saves & operator.
            if(index >= 0){
                operatorsBwBraces[index] = exp[text.index - 1];
            }
            index++;
        }
        exp = results;
    }
    else{
        return parseNonBracket(exp);
    }

    // Verify the parsing
    if(exp.length != (operatorsBwBraces.length + 1)){
        console.log("Bad operator or parsing error");
        return;
    }


    // Now exp should either have multiple filters seperated by & or | or just one filer
    // split by And and  evaluate
    var thisExp = exp;
    var allExpsInBraces = [];
    // console.log(exp);
    // console.log(operatorsBwBraces);
    //  console.log("length is : " + exp.length + "\n");

    for(var i=0; i<exp.length; i++){
        // Split by both AND and OR
        var andExp = exp[i].split('&');
        var orExp = exp[i].split('|');

        var finalExp = [];
        var len = 0;
        var allObjs = [];

        // The operator can only be AND or OR if it exist. Cant be both.
        // Ex: a>b&c<d&a<c or a>b|c<d|a<c
        // If the logical operator doesnot exists, then its just one comparasion operator.
        if(andExp.length > 1){
            finalExp = andExp
            for(var j=0; j<andExp.length; j++){
                allObjs.push(evalExp(finalExp[j]));
            }
        }
        else if(orExp.length > 1){
            finalExp = orExp;
            for(var j=0; j<orExp.length; j++){
                allObjs.push(evalExp(finalExp[j]));
            }
        }
        else {
            finalExp = exp[i];
            allObjs.push(evalExp(finalExp));
        }
        // Start with the 0th element.
        var innerFilter = allObjs[0];

        // If there is a logical operator, replace the filter with the new parse data.
        if(allObjs.length > 1){
            if(andExp.length > 1){
                innerFilter = parseAND(allObjs);
            }
            else{
                innerFilter = parseOR(allObjs);
            }
        }
        // This is the filter of an expression within one {}. If there are multiple {},
        // then use the operator that was between {} to find the final filter.
        allExpsInBraces[i] = innerFilter;

        // Every time this gets replaced and the final iterator would have the final filter.
        var finalFilter ;

        if(allExpsInBraces.length > 1){
            if(operatorsBwBraces[0] == '&'){
                finalFilter = parseAND(allExpsInBraces);
            }
            else if(operatorsBwBraces[0] == '|'){
                finalFilter = parseOR(allExpsInBraces);
            }
            else{
                console.log("Error while parsing filter !!");
            }
        }
        else{
            finalFilter = allExpsInBraces[0];
        }
    }
    return finalFilter;
}


var evalExp = function(exp){

    if(exp.includes(">=")){
        exp = exp.split(">=");
        return parseGreaterThanEqual(exp[0], exp[1]);
    }

    if(exp.includes("<=")){
        exp = exp.split("<=");
        return parseLessThanEqual(exp[0], exp[1]);
    }

    if(exp.includes(">")){
        exp = exp.split(">");
        return parseGreaterThan(exp[0], exp[1]);
    }

    if(exp.includes("<")){
        exp = exp.split("<");
        return parseLessThan(exp[0], exp[1]);
    }

    if(exp.includes("!=")){
        exp = exp.split("!=");
        return parseNotEqual(exp[0], exp[1]);
    }

    if(exp.includes("=")){
        exp = exp.split("=");
        return parseEqual(exp[0], exp[1]);
    }
}

// Parses filters with no braket.
var parseNonBracket = function(exp){
    var andExp = exp.split('&');
    var orExp = exp.split('|');
    var finalExp = [];
    var len = 0;
    var allObjs = [];

    if(andExp.length > 1){
        finalExp = andExp
        len = andExp.length;
        for(var j=0; j<len; j++){
            allObjs.push(evalExp(finalExp[j]));
        }
    }
    else if(orExp.length > 1){
        finalExp = orExp;
        len = orExp.length;
        for(var j=0; j<len; j++){
            allObjs.push(evalExp(finalExp[j]));
        }
    }
    else {
        finalExp = exp;
        allObjs.push(evalExp(finalExp));
    }
    var filter = allObjs[0];
    if(allObjs.length > 1){
        if(andExp.length > 1){
            filter = parseAND(allObjs);
        }
        else{
            filter = parseOR(allObjs);
        }
    }
    return filter;

}



/************ Testing code *********/

// var connectRule = 'mongodb://127.0.0.1:27017/' + 'dbcomp';

// MongoClient.connect(connectRule, function(err,db) {
//
//     if (err) throw err;
//     console.log("Connected to Database");
//
//     db.collection('testdb', function(err, collection){
//         if(err){
//             console.log("Error in collection");
//             return;
//         }
//         var filterG = parseGreaterThan('gpa','3.5');
//         collection.find(filterG, {name:true}, function(err, resultCursor) {
//
//
//             // Reference from stackoverflow: https://goo.gl/ROAaxU
//             resultCursor.nextObject(function fn(err, item) {
//                 if (err){
//                     console.log("error reading cursor" + resultCursor);
//                     return;
//                 }
//                 else if(!item) {
//                 //    console.log("\n\n");
//                     return;
//                 }
//                 setImmediate(fnAction, item, function() {
//                     resultCursor.nextObject(fn);
//                 });
//             });
//
//             function fnAction(items, callback) {
//             //    console.log(items);
//                 return callback();
//             }
//         });
//
//
//         var filterL = parseLessThan('gpa', 4);
//         collection.find(filterL, {name:true}, function(err, resultCursor) {
//             // console.log(resultCursor);
//
//
//             // Reference from stackoverflow: https://goo.gl/ROAaxU
//             resultCursor.nextObject(function fn(err, item) {
//                 if (err){
//                     console.log("error reading cursor" + resultCursor);
//                     return;
//                 }
//                 else if(!item) {
//                     return;
//                 }
//                 setImmediate(fnAction, item, function() {
//                     resultCursor.nextObject(fn);
//                 });
//             });
//
//             function fnAction(items, callback) {
//             //    console.log(items);
//                 return callback();
//             }
//         });
//
//         var exp = [];
//
//         exp.push(filterL);
//         exp.push(filterG);
//         var filter = parseAND(exp);
//
//         collection.find(filter,  {name:true},function(err, resultCursor) {
//
//
//             // Reference from stackoverflow: https://goo.gl/ROAaxU
//             resultCursor.nextObject(function fn(err, item) {
//                 if (err){
//                     console.log("error reading cursor" + resultCursor);
//                     return;
//                 }
//                 else if(!item) {
//                 //    console.log("\n\n");
//                     return;
//                 }
//                 setImmediate(fnAction, item, function() {
//                     resultCursor.nextObject(fn);
//                 });
//             });
//
//             function fnAction(items, callback) {
//             //    console.log(items);
//                 return callback();
//             }
//         });
//
//         var filter = parseOR(exp);
//
//         collection.find(filter, {name:true}, function(err, resultCursor) {
//
//
//             // Reference from stackoverflow: https://goo.gl/ROAaxU
//             resultCursor.nextObject(function fn(err, item) {
//                 if (err){
//                     console.log("error reading cursor" + resultCursor);
//                     return;
//                 }
//                 else if(!item) {
//                 //    console.log("\n\n");
//                     return;
//                 }
//                 setImmediate(fnAction, item, function() {
//                     resultCursor.nextObject(fn);
//                 });
//             });
//
//             function fnAction(items, callback) {
//                 //console.log(items);
//                 return callback();
//             }
//         });
//
//     });
// });
