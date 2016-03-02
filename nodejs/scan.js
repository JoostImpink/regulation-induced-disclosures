'use strict';

// system modules
var fs = require('fs');
// local modules
var config = require('./config');

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
	scan: function( keywords ){
		var retVal = { id: this.id };
		var f = this.filing;
		keywords.forEach( function(k){			
			var matches = f.match(k.regex) || [];
			retVal[k.name] = matches.length;
		});
		return retVal;
	}
};