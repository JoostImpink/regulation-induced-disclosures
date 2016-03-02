'use strict';

module.exports = {

	// directory with SEC filings
	filingsDir: "F:/edgar/10K_filings/",

	// helper function to get path for id
	fileIdToPath: function( id ){ return this.filingsDir + id + ".txt"; },

	// import holds file with fileIds to read
	fileIds: "./import/downloadIds_in_sample_1999_2008.txt",
	fileIdsTest: "./import/downloadIds_in_sample_2000_2008_first_50.txt",

};