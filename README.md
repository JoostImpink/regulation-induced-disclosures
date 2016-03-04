## regulation-induced-disclosures

### Code used to download and scan 10-K filings and create a disclosure complexity index as used in: Regulation-Induced Disclosures: Is ‘More’ Actually ‘Less’?

You may use the code in this repository but we ask that you cite our paper:  *Regulation-Induced Disclosures: Is ‘More’ Actually ‘Less’? Joost Impink, Mari Paananen and Annelies Renders*

### General

This repository contains the following code:
- A perl script to download 10-K filings from SEC Edgar
- A nodejs script that scans the 10-K filings for keywords using regular expressions
- SAS code that creates input datasets for perl and nodejs, imports nodejs outsput and creates the index  

### Requirements

It is assumed you have a local copy of Compustat Fundamental Annual available in SAS as `comp.funda` (otherwise, wrap the relevant code in an `rsubmit` block).


### Assumed folder structure

	The following folder structure is assumed:

		F:\temp\
  			sas\			SAS code (this file and macros)
  			perl\			Perl script
  			nodejs\			Nodejs script
  			edgar\			SAS library folder for SEC filings archive
  			mylib\			SAS library folder
  			10K_filings\	folder with downloaded 10Ks
	
	Note:
	- The main folder (in this case `F:\temp\` can be set in a macro variable `projectDir`
	
### Steps

1. Set up folder structure, download and extract SEC filings archive
2. SAS: Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it
3. Perl: Download the 10-Ks see per/download.perl, optional (code not included): Scan 10-Ks to get fiscal year end (variable 'CONFORMED PERIOD OF REPORT' in the 10-K header)
4. SAS: Create dataset based of Compustat Funda and append downloadId based on Edgar filings, export file with ids to scan for keywords
5. Nodejs: Scan 10-Ks for keywords
6. SAS: Import keywords, create index

Steps are described in more detail below.

### 1. 	Download and extract SEC filings archive 

A SAS dataset containing firm name, central index key, form type, filing date for filings over 1993-2015 is available at: http://www.wrds.us/index.php/repository/view/25
Download the .zip, and extract it to a folder, e.g. F:\temp\edgar, and rename the sas data set to 'filings' 
Create a library edgar to this folder, create library (mylib) to store datasets
		
    /*	Path to folder that holds /perl, /nodejs, /sas (set this to match your folder) */
    %let projectDir = "F:\temp\";
    /*	Location where the SEC archive is extracted */
    libname edgar "&projectDir.edgar";
    /*	Local library to store files */
    libname mylib "&projectDir.myLib";
    
    /* 	Load macros */
    /*	Macro that constructs the complexity disclosure index */
    %include "&projectDir.sas\macro_create_index.sas";
    /*	Helper macro to work with arrays */
    %include "&projectDir.sas\macro_do_over.sas";


###	2. Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it 

    /* 	Select 10-K (and amended) filings */
    proc sql;
        create table mylib.a_sec as
        select 
            distinct cik, coname as edgarConame, filename as url, 
            date as filingdate10K, formtype, 
    		/* creates counter, used to uniquely identify each 10-K filing */
    		monotonic() as downloadId
        from
            edgar.filings b
        where
            formtype IN ("10-K", "10-K/A", "10-K405", "10-K405/A", "10-KSB", "10-KSB/A", "10-KT", 
    		/* for completeness include amended filings */
    		"10-KT/A", "10KSB", "10KSB/A", "10KSB40", "10KSB40/A", "10KT405", "10KT405/A");
    quit;
    
    /*	Create dataset with just the downloadId and url to be downloaded with perl */
    proc export data = mylib.a_sec (keep = downloadId url) 
    outfile = "&projectDir.perl_download_these.txt" dbms=csv replace; putnames=no; run;

###	3. 	Perl: Download the 10-Ks

Navigate to the perl directory

    cd F:\temp\perl

Execute the perl script

    perl download.pl

Perl will go through the urls (and downloadIds)  `perl_download_these.txt` and will write the filings as `<filingId>.txt` in folder `F:\temp\10K_filings`. Note that filings in HTML format will still be written as `.txt`. To manually inspect an HTML filing, you can make a copy and rename it to `<filingId>.html` to open it in a browser. 

The next step matches the 10-K filings based on the filingdate. Since Edgar archive data does not provide the fiscal year end, this match is not very exact (some filings may be delayed more than a year). The header in the 10-K does contain the field `conformed end of period`, which is the fiscal year end. You may want to first scan the 10-Ks and retrieve this date. Then, a match on Compustat Funda can be made on `CIK` and `datadate` in Funda, versus `CIK` and `conformed end of period` in the filings (note that `datadate` may be a few days before/after the exact fiscal year end).


###	4. 	Create dataset based of Compustat Funda and append downloadId based on Edgar filings, 
		export file with ids to scan for keywords                                                        

Here a dataset is created based on Funda with the `downloadId` appended. Then a dataset with all the downloadIds to scan is exported. Typically, only a portion of all 10-Ks in Edgar need to be scanned (not all firms that file with the SEC are on Funda, also, roughly 30-40% of the observations are lost as `CIK` is often missing in Funda or has changed over time. 
    
    /* 	Match Funda with SEC Edgar to get downloadId. 
    	Left join so we can assess how many observations are lost because of missing/changed CIK (roughly 40%)
    	For simplicity assume that a 10-K is filed within 120 days after year end
    	A more precise way would be to first scan all 10-Ks and retrieve the exact end of year date */
    proc sql;
    	create table mylib.b_funda_sec as select a.*, b.downloadId 
    	from (
    		/* Get some key variables from Funda, require fyears 1993 and up and positive assets */
    		select a.gvkey, a.fyear, a.datadate, a.sich, a.conm, a.cik, a.at, a.sale, a.ceq, a.ni
    		from comp.funda a where fyear >= 1993 and at > 0 
    		and a.indfmt='INDL' and a.datafmt='STD' and a.popsrc='D' and a.consol='C'
    	) a 
    	left join mylib.a_sec b
    	/* CIK on Funda is character, and on Edgar it is numeric */
    	on input(a.cik, 18.) eq b.cik
     	/* 10-K filing date within 120 days after fiscal year end */
    	and a.datadate <= b.filingdate10K <= a.datadate+120 
    	/* Get 10-Ks, ignore amended filings */	
    	and b.formtype IN ("10-K", "10-K405", "10-KSB", "10-KT", "10KSB",  "10KSB40", "10KT405"); 
    quit;
    
    data mylib.copy ; set mylib.b_funda_sec;run;
    
    /*	Decide which 10-Ks to actually scan, in this case all (with nonmissing downloadId), 
    	export dataset with downloadId for nodejs */
    proc export data = mylib.b_funda_sec (keep = downloadId where=(missing(downloadId) eq 0)) 
    outfile = "&projectDir.nodejs_scan_these.txt" dbms=csv replace; putnames=no; run;


###	5. 	Nodejs: Scan 10-Ks for keywords, 

navigate to /nodejs/ and run: 

    node index.js > output/keywords.csv

The nodejs output is imported in the next step	

	
###	6. SAS: Import keywords, create index                                                                                      

In the last step of this example we import the keywords, and create a dataset with the index. We use a separate macro to construct the index, to allow for variations (for sensitivity analyses).
    
    /* 	Path to nodejs output */             
    filename KEYWORDS "&projectDir.nodejs\output\keywords.csv";
    
    /* 	Keyword variable names */
    %let keywordVars = sfas133 sfas138 sfas142 sfas143 sfas157 sfas159 sfas123 compdiscuss fin46r fin47 section404 section401 section1a;
    		
    data mylib.c_keywords;
    infile KEYWORDS dsd delimiter=","  firstobs=2 LRECL=32767 missover;
    input downloadId &keywordVars;
    run;
    
    /* 	Append keywords to main dataset */
    proc sql; 
    	create table mylib.d_funda_keywords as select a.*, b.* from mylib.b_funda_sec a left join mylib.c_keywords b on a.downloadId = b.downloadId;
    quit;

Here the index is appended to the dataset. The variable will be named `index_2` and the scoring is based on below/above the median. 
    
    /* 	Create index */
    %appendIndex(dsin=mylib.d_funda_keywords, dsout=mylib.e_index1, keywordvars=&keywordVars, groups=2, scoreName=index_2);

We add another index, this time using fewer keywords (just for illustration) and with terciles (max score of 3 for each keyword, based on first/middle/last tercile)
    
    /*	For sensitivity tests create index (for example) using terciles without sfas 157 and 159 */
    %let keywordVarsAlt = sfas133 sfas138 sfas142 sfas143 sfas123 compdiscuss fin46r fin47 section404 section401 section1a;
    %appendIndex(dsin=mylib.e_index1, dsout=mylib.e_index2, keywordvars=&keywordVarsAlt, groups=3, scoreName=index_3);
