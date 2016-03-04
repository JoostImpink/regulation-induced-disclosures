/*

	SAS macro to append the disclosure complexity index to a dataset

	Assumes that macro %do_over is defined

	Arguments:
		dsin: input dataset, needs to have downloadId (id of filing), and the keyword variables
		dsout: name of output dataset, will have index appended to it
		keywordvars: list of keyword variables (e.g. sfas133 sfas138 sfas142 ...)	
		groups: number to indicate the score, default is 2
			Value of 2 means a keyword scoring as follows:
			 - 0 if keyword count is 0 or 1 (1 is considered the same as not mentioning at all)
			 - 1 if mentioned more than once, but less than median count
			 - 2 keyword count is above median 
			Value of 3 means ranking keyword count into terciles, highest tercile score 3, middle 2,
			low 1, and score of 0 for counts of 0 or 1
		scoreName: name of new variable that is added to dsout, default is index_2

*/

%macro appendIndex(dsin=, dsout=, keywordvars=, groups=2, scoreName=index_2);

	/* Prepare dataset with only vars that are needed*/
	data rank0 (keep = gvkey fyear downloadId &keywordvars);
	set &dsin;
	/* treat zeros as missings, so these are ignored in proc rank */
	%do_over(values=&keywordvars, phrase=if ? eq 0 then ? =.;);
	/* If mentioned only once, consider it not mentioned: set to missing  */
	%do_over(values=&keywordvars, phrase=if ? eq 1 then ? =.;);
	/* only if 10K could be scanned */
	if missing(downloadId) eq 0;
	run;

	/* 	Create ranked variables */
	proc sort data = rank0 ; by fyear;run;
	proc rank data = rank0 out = rank1 groups = &groups;
	var &keywordvars ;
	by fyear; 														
	run;

	/* 	Add 1 to all ranked scores, and replace missings with 0, then add them */
	data rank2;
	set rank1;
	/*	Add 1 to all rank variables */
	%do_over(values=&keywordvars, phrase=? = ? + 1;);
	/*  Turn missings back into zeros */
	%do_over(values=&keywordvars, phrase=if ? eq . then ? = 0;);
	/* 	Construct measure by adding the ranked values for each keyword */	
	score = %do_over(values=&keywordvars, between=%str(+) ) ;
	run;

	/*	Create output dataset */
	proc sql;
		create table &dsout as select a.*, b.score as &scoreName 
		from &dsin a left join rank2 b 
		on a.downloadId = b.downloadId;
		/* cleanup
		drop table rank0, rank1, rank2; */
	quit;
	
%mend;



