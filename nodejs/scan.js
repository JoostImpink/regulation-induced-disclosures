//'use strict';

// system modules
var fs = require('fs');
var htmlToText = require('html-to-text');

// local modules
var config = require('./config');
var _ = require('lodash');

// helper function that makes regex depending on isHTML
function makeRegX (keyword, isHTML){
 		var regx;
 		if (isHTML) {				
 			regx = new RegExp( '<([A-Z][A-Z0-9]*)\b[^>]*>[^<]*?' + keyword + '[\s\S]*?<\/\1>', "igm");
 		} else {
 			regx = new RegExp( '^\r?\n(?:.+\r?\n)*.*' + keyword +  '.*\r?\n(?:.+\r?\n)*(?=\r?\n)' , "igm");
 		}
		return regx;
}

// compute #count and average length
function matchStats (matches, keyword, isHTML){
		var retVal = { count: 0, avgLength: 0};
		retVal.count = matches.length;
		var sum = 0;
		if (matches.length > 0) {
			console.log('matches for keyword' + keyword);
		}
		// compute sum of all matches length
		matches.forEach ( function(m) {

			var matchTextNoHTML = (isHTML) ? m.replace(/(<([^>]+)>)/ig,"") : m;
			sum = sum + matchTextNoHTML.length;

			console.log( matchTextNoHTML );
			console.log('html: ' + isHTML );
			console.log('length: ' + matchTextNoHTML.length);

		});
		// compute average length
		if (matches.length > 0) {
			retVal.avgLength = sum / matches.length;
		}
		return retVal;
}

module.exports = {

	id: null,
	filing: null,
	isHTML: null,

	// id: filing id
	init: function(id){
		this.id = id;
		// get path
		var filingPath = config.fileIdToPath(id);
		this.filing = fs.readFileSync( filingPath , "utf8");
		// replace html entities (&nbsp; etc) with space
		this.filing = this.filing.replace(/&[^;\s]+;/g, " ");
		// get rid of span and font tags		
		this.filing = this.filing.replace(/<[\/]{0,1}(font|span)[^><]*>/ig, "");		
		// HTML filing?
		this.isHTML = ( this.filing.search(/\<HTML\>/i) > - 1 || this.filing.search(/\<DIV\>/i) > - 1  ) ? true : false;
	},

	// keywords: array of objects { name, regex }
	// this function returns the matched string and position for each match
	scan: function( keywords ){
		var retVal = { id: this.id, print: false };
		var f = this.filing;
		keywords.forEach( function(k){			
			// matches for the keyword
			var res = [];
			//k.regex is the 'short' (quicker) regex
			while ((match = k.regex.exec( f )) != null) {			     			    
			    // get some text around the match and strip html			    
				var portion =  f.substr(match.index - 1000, 2000) ;
				// strip html (if any)
				portion = htmlToText.fromString( portion, {wordwrap:false} );
				// strip periods etc (interferes with regex)
				portion = portion.replace(/[^\w\s]|_/g, "");
			    // grab the 6 words around the keyword using the slower/longer regex, returns array
			    var sixwords = portion.match(k.regexLong);
   			    // append sixwords (array) to array of results
			    res = _.concat(res, sixwords);
			}
			// go through all results to determine if it contains 'not'/'no', and 'material'
			var isNot = [];

			// some keywords do not need to be negated ("")
			if (! k.noNegate){ 
			res.forEach( function(el){
					if (el && el.match(/\b(?:not|no)\b[\s\S]*\bmaterial\b/g)   ) {
						isNot.push( el );
					}
				} );
			}

			// drop doubles
			isNot = _.uniq(isNot);			
			// set result for keyword			
			retVal[k.name] = {			
				allCount: res.length,
				isNot: isNot.length,		
			};
			// debugging
			if (isNot.length > 0 ) { retVal.print = true; }
		});
		return retVal;
	},

	// keywords: array of objects { name, regex }
	getlength: function( keywords ){
		var retVal = { id: this.id };
		var f = this.filing;
		var isHTML = this.isHTML;
		keywords.forEach( function(k){

			var regX = makeRegX( k.regex , this.isHTML );	
			var matches = f.match(regX) || [];
			retVal[k.name] = matchStats ( matches , k.regex , isHTML);
		});		
		return retVal;
	}

};
