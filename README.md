## Regulation-Induced Disclosures: Evidence of Information Overload?

### This repository contains code to download and scan 10-K filings and create a disclosure complexity index

#### You may freely use the code in this repository but we ask that you cite our paper:  *Impink, Joost and Paananen, Mari and Renders, Annelies, Regulation-Induced Disclosures: Evidence of Information Overload? A previous version of the paper is available at SSRN: http://ssrn.com/abstract=2742059*

### General

This repository contains the following code:
- A perl script to download 10-K filings from SEC Edgar
- A nodejs script that scans the 10-K filings for keywords using regular expressions
- SAS code that creates input datasets for perl and nodejs, imports nodejs outsput and creates the index  

The files in the repository can be [downloaded as a zipfile](https://github.com/JoostImpink/regulation-induced-disclosures/archive/master.zip).

### Assumed folder structure

	The following folder structure is assumed:

		F:\temp\
  			sas\			SAS code (main.sas file and macros)
  			perl\			Perl script
  			nodejs\			Nodejs script
  			edgar\			SAS library folder for SEC filings archive
  			myLib\			SAS library folder
  			10K_filings\	folder with downloaded 10Ks
	
	Notes:
	- The main folder used in the code (`F:\temp\`) can be set to another folder in a macro variable `projectDir`
	- The zipfile contains folders sas, perl and nodejs; the other folders need to be created manually
	
### Requirements

It is assumed you have a local copy of Compustat Fundamental Annual available in SAS as `comp.funda` (otherwise, wrap the relevant code in an `rsubmit` block).

### Steps

1. Set up folder structure, download and extract SEC filings archive
2. SAS: Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it
3. Perl: Download the 10-Ks see per/download.perl
4. SAS: Create dataset based of Compustat Funda and append downloadId based on Edgar filings, export file with ids to scan for keywords
5. Nodejs: Scan 10-Ks for keywords
6. SAS: Import keywords, create index

Steps are described in more detail below.

### 1. 	Download and extract SEC filings archive 

A SAS dataset containing firm name, central index key, form type, filing date for filings over 1993-2015 is available at: http://www.wrds.us/index.php/repository/view/25
Download the .zip, and extract it to a folder, e.g. F:\temp\edgar, and rename the sas data set to 'filings' 
Create a library edgar to this folder, create library (mylib) to store datasets

```sas		
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
```

###	2. Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it 

```sas
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
```
###	3. 	Perl: Download the 10-Ks

Navigate to the perl directory

    cd F:\temp\perl

Execute the perl script

    perl download.pl

Perl will go through the urls (and downloadIds)  `perl_download_these.txt` and will write the filings as `<filingId>.txt` in folder `F:\temp\10K_filings`. Note that filings in HTML format will still be written as `.txt`. To manually inspect an HTML filing, you can make a copy and rename it to `<filingId>.html` to open it in a browser. 

The next step matches the 10-K filings based on the filingdate. Since Edgar archive data does not provide the fiscal year end, this match is not very exact (some filings may be delayed more than a year). The header in the 10-K does contain the field `conformed end of period`, which is the fiscal year end. You may want to first scan the 10-Ks and retrieve this date. Then, a match on Compustat Funda can be made on `CIK` and `datadate` in Funda, versus `CIK` and `conformed end of period` in the filings (note that `datadate` may be a few days before/after the exact fiscal year end).


###	4. 	Create dataset based of Compustat Funda and append downloadId based on Edgar filings, export file with ids to scan for keywords                                                        

Here a dataset is created based on Funda with the `downloadId` appended. Then a dataset with all the downloadIds to scan is exported. Typically, only a portion of all 10-Ks in Edgar need to be scanned (not all firms that file with the SEC are on Funda, also, roughly 30-40% of the observations are lost as `CIK` is often missing in Funda or has changed over time. 
```sas
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
    
    /*	Decide which 10-Ks to actually scan, in this case all (with nonmissing downloadId), 
    	export dataset with downloadId for nodejs */
    proc export data = mylib.b_funda_sec (keep = downloadId where=(missing(downloadId) eq 0)) 
    outfile = "&projectDir.nodejs_scan_these.txt" dbms=csv replace; putnames=no; run;
```

###	5. 	Nodejs: Scan 10-Ks for keywords 

We scan the 10-K filings using nodejs (download at [https://nodejs.org/en/download/](https://nodejs.org/en/download/)).

Navigate to `F:\temp\nodejs` and run: 

    node index.js > output/keywords.csv

The nodejs script will read the downloadIds in `nodejs_scan_these.txt` and scan these for the keywords. The output is written in `F:\temp\nodejs\output\keywords.csv` and is imported in SAS in the next step.

	
###	6. SAS: Import keywords, create index                                                                                      

In the last step of this example we import the keywords, and create a dataset with the index. We use a separate macro to construct the index, to allow for variations (for sensitivity analyses).
```sas    
    /* 	Path to nodejs output */             
    filename KEYWORDS "&projectDir.nodejs\output\keywords.csv";
    
    /* 	Keyword variable names */
    %let keywordVars = SFAS133 isNotSFAS133 SFAS138 isNotSFAS138 SFAS142 isNotSFAS142 SFAS143 isNotSFAS143 SFAS157 isNotSFAS157
    SFAS159 isNotSFAS159 SFAS123 isNotSFAS123 compensation isNotcompensation FIN46 isNotFIN46 FIN47 isNotFIN47 section404 
    isNotsection404 section401 isNotsection401 section1a isNotsection1a SFAS140 isNotSFAS140 SFAS148 isNotSFAS148 SFAS132 
    isNotSFAS132 SFAS158 isNotSFAS158 SFAS146 isNotSFAS146 SFAS144 isNotSFAS144 SFAS149 isNotSFAS149;
   		
    data mylib.c_keywords;
    infile KEYWORDS dsd delimiter=","  firstobs=2 LRECL=32767 missover;
    input downloadId &keywordVars;
    run;
    
    /* 	Append keywords to main dataset */
    proc sql; 
    	create table mylib.d_funda_keywords as 
    	select a.*, b.* from mylib.b_funda_sec a 
    	left join mylib.c_keywords b 
    	on a.downloadId = b.downloadId;
    quit;
    
    /* 	Final processing here: 
	- replace single counts with 0
	- standardize by industry-year
	- index equals the sum standardized counts  */
	
```
