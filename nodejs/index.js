'use strict';

/*
	run with: node index.js > output/keywords.csv
*/

///////////////////////////////////////////////////////////// Settings
// set testing flag to true/false
var test = false;
// also note there are settings in config.js 
// (names of files with ids to scan, location of filings on hard disk)

//////////////////////////////////////////////////////////////////////

// system modules
var fs = require('fs');

// local modules
var config = require('./config');
var scan = require('./scan');

// filename that holds ids (set in config)
var filenameIds = test ?  config.fileIdsTest : config.fileIds ;

/*
	keywords, array of { name, regex }
*/
var keywords = [
	{ name: "SFAS133", regex: /FAS(\s+No\.?)?\s*133/igm },
	{ name: "SFAS138", regex: /FAS(\s+No\.?)?\s*138/igm },
	{ name: "SFAS142", regex: /FAS(\s+No\.?)?\s*142/igm },
	{ name: "SFAS143", regex: /FAS(\s+No\.?)?\s*143/igm },
	{ name: "SFAS157", regex: /FAS(\s+No\.?)?\s*157/igm },
	{ name: "SFAS159", regex: /FAS(\s+No\.?)?\s*159/igm },
	{ name: "SFAS123", regex: /FAS(\s+No\.?)?\s*123\(?\-?R/igm },
	{ name: "compensation", regex: /compensation\s+discussion\s+and\s+analysis/igm },
	{ name: "FIN46", regex: /\bFIN\s*46\(?\-?R/igm },
	{ name: "FIN47", regex: /\bFIN\s*47\b/igm },	
	{ name: "section404", regex: /internal\s*control\s*over\s*financial\s*reporting/igm },
	{ name: "section401", regex: /^(?!.*(no|any)).*off-balance\s*sheet\s*arrangements/igm },
	{ name: "section1a", regex: /^(?!.*(not\s*applicable|omitted)).*((\bsection\b)|(\bitem\b))\s+1\(?A/igm }
];

// load fileIds into array
var fileIds = fs.readFileSync( filenameIds ).toString().split("\r\n");
//drop first element (header)
fileIds.shift();

// print header
var header = keywords.map(function(d) { return d.name;}).join(",")
console.log("id," + header);

// loop through files
fileIds.forEach( function(id){

	// init (loads filing)
	scan.init(id);
	// scan keywords
	var result = scan.scan( keywords ) ;
	// convert result into csv string
	var entry = keywords.map(function(d) { return result[d.name];}).join(",");
	// write output to screen
	console.log( id + "," + entry );
});
