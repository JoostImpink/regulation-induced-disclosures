'use strict';

/*
	note: set test to true/false
	run with: node index.js > output/keywords_sep_2015.csv
*/

// system modules
var fs = require('fs');

// local modules
var config = require('./config');
var scan = require('./scan');

// set testing flag to true/false
var test = false;

// filename that holds ids (set in config)
var filenameIds = test ?  config.fileIdsTest : config.fileIds ;

/*
	keywords, array of { name, regex }
*/
var keywords = [
	{ name: "SFAS133", regex: /FAS(\s+No\.?)?\s*133/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*133(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS138", regex: /FAS(\s+No\.?)?\s*138/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*138(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS142", regex: /FAS(\s+No\.?)?\s*142/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*142(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS143", regex: /FAS(\s+No\.?)?\s*143/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*143(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS157", regex: /FAS(\s+No\.?)?\s*157/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*157(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS159", regex: /FAS(\s+No\.?)?\s*159/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*159(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS123", regex: /FAS(\s+No\.?)?\s*123\(?\-?R/igm, 										regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*123\(?\-?R(\W?\w+\W+){0,12}/igm  },
	{ name: "compensation", regex: /compensation\s+discussion\s+and\s+analysis/igm, 					regexLong: /(\w+\W+){0,12}compensation\s+discussion\s+and\s+analysis(\W?\w+\W+){0,12}/igm , noNegate: true },
	{ name: "FIN46", regex: /\bFIN\s*46\(?\-?R/igm, 													regexLong: /(\w+\W+){0,12}\bFIN\s*46\(?\-?R(\W?\w+\W+){0,12}/igm  },
	{ name: "FIN47", regex: /\bFIN\s*47\b/igm, 															regexLong: /(\w+\W+){0,12}\bFIN\s*47\b(\W?\w+\W+){0,12}/igm  },
	{ name: "section404", regex: /internal\s*control\s*over\s*financial\s*reporting/igm, 					regexLong: /(\w+\W+){0,12}internal\s*control\s*over\s*financial\s*reporting(\W?\w+\W+){0,12}/igm , noNegate: true  },
	{ name: "section401", regex: /^(?!.*(no|any)).*off-balance\s*sheet\s*arrangements/igm, 					regexLong: /(\w+\W+){0,12}^(?!.*(no|any)).*off-balance\s*sheet\s*arrangements(\W?\w+\W+){0,12}/igm , noNegate: true },
	{ name: "section1a", regex: /^(?!.*(not\s*applicable|omitted)).*((\bsection\b)|(\bitem\b))\s+1\(?A/igm, regexLong: /(\w+\W+){0,12}^(?!.*(not\s*applicable|omitted)).*((\bsection\b)|(\bitem\b))\s+1\(?A(\W?\w+\W+){0,12}/igm , noNegate: true },
	{ name: "SFAS140", regex: /FAS(\s+No\.?)?\s*140/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*140(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS148", regex: /FAS(\s+No\.?)?\s*148/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*148(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS132", regex: /FAS(\s+No\.?)?\s*132\(?\-?R/igm, 										regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*132\(?\-?R(\W?\w+\W+){0,12}/igm  },
	{ name: "SFAS158", regex: /FAS(\s+No\.?)?\s*158/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*158(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS146", regex: /FAS(\s+No\.?)?\s*146/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*146(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS144", regex: /FAS(\s+No\.?)?\s*144/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*144(\W?\w+\W+){0,12}/igm },
	{ name: "SFAS149", regex: /FAS(\s+No\.?)?\s*149/igm, regexLong: /(\w+\W+){0,12}S?FAS(\s+No\.?)?\s*149(\W?\w+\W+){0,12}/igm },

];

// load fileIds into array
var fileIds = fs.readFileSync( filenameIds ).toString().split("\r\n");
//drop first element (header)
fileIds.shift();

// print header: list of keywords, isNotKeywords (SFAS133, isNotSFAS133, etc)
var header = keywords.map(function(d) { return d.name + ",isNot" + d.name ;}).join(",")
console.log("id," + header);

// loop through files
fileIds.forEach( function(id){

	// init (loads filing)
	scan.init(id);
	// scan keywords
	var result = scan.scan( keywords ) ;
	// // convert result into csv string
	var entry = keywords.map(function(d) { return result[d.name].allCount +","+result[d.name].isNot;}).join(",");
	// push to screen
	console.log( id + "," + entry );

});
