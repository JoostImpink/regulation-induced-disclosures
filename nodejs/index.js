'use strict';

/*
	run with: node index.js > output/keywords.csv
*/

///////////////////////////////////////////////////////////// Settings
// directory with SEC filings
var filingsDir = "F:/temp/10K_filings/";
// import holds file with fileIds to read
var fileIds = "F:/temp/nodejs_scan_these.txt";
//////////////////////////////////////////////////////////////////////

// system modules
var fs = require('fs');
// local module
var scan = require('./scan');

// helper function to get full path for filing with @id (number)
function fileIdToPath(id){ return filingsDir + id + ".txt"; };

// 	keywords structure, array of { name, regex }
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
var fileIds = fs.readFileSync( fileIds ).toString().split("\r\n");

// print header
var header = keywords.map(function(d) { return d.name;}).join(",")
console.log("id," + header);

// loop through files
fileIds.forEach( function(id){
	// init (loads filing)
	var path = fileIdToPath(id);
	scan.init(id, path);
	// scan keywords
	var result = scan.scan( keywords ) ;
	// convert result into csv string
	var entry = keywords.map(function(d) { return result[d.name];}).join(",");
	// write output to screen
	console.log( id + "," + entry );
});
