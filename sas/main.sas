/*
	Scan 10-Ks for keywords

	Note:
	- make sure you set libraries (edgar, mylib), projectDir, macros to correct folders
	- it is assumed that comp.funda is available locally (if not, wrap that code in a rsubmit block)

	Steps:
	1. Set up folder structure, download and extract SEC filings archive
	2. SAS: Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it
	3. Perl: Download the 10-Ks see per/download.perl, optional (code not included): Scan 10-Ks to get fiscal year end (variable 'CONFORMED PERIOD OF REPORT' in the 10-K header)
	4. SAS: Create dataset based of Compustat Funda and append downloadId based on Edgar filings, export file with ids to scan for keywords
	5. Nodejs: Scan 10-Ks for keywords
	6. SAS: Import keywords, create index


	The following folder structure is assumed:

		F:\temp\ (set as macro variable projectDir)
			sas\			SAS code (this file and macros)
			perl\			Perl script
			nodejs\			Nodejs script
			edgar\			SAS library folder for SEC archive
			mylib\			SAS library folder
			10K_filings\	folder with downloaded 10Ks

*/

/*	1. 	Download and extract SEC filings archive 
		A SAS dataset containing firm name, central index key, form type, filing date for filings over 1993-2015 is available at: http://www.wrds.us/index.php/repository/view/25
		Download the .zip, and extract it to a folder, e.g. F:\temp\edgar, and rename the sas data set to 'filings' 
		Create a library edgar to this folder, create library (mylib) to store datasets
*************************************************************************************************************/

/*	Path to folder that holds /perl, /nodejs, /sas (set this to match your folder) */
%let projectDir = F:\temp\;
/*	Location where the SEC archive is extracted */
libname edgar "&projectDir.edgar";
/*	Local library to store files */
libname mylib "&projectDir.myLib";

/* 	Load macros */
/*	Macro that constructs the complexity disclosure index */
%include "&projectDir.sas\macro_create_index.sas";


/*	2. Download and extract zipfile of SEC filings archive, create dataset with ids and urls, and export it 
*************************************************************************************************************/

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

/*	3. 	Perl: Download the 10-Ks, \perl\download.perl         
		optional (code not included): Scan 10-Ks to get fiscal year end 
		(variable 'CONFORMED PERIOD OF REPORT' in the 10-K header)
		If end of fiscal year in 10-K would be appended to mylib.a_sec, then the match in the next step
		would be more precise.
		At this point there is not yet the need to import anything (we don't want to scan all 10K's, we only
		want to scan the 10-Ks that are in our sample)
*************************************************************************************************************/

/*	4. 	Create dataset based of Compustat Funda and append downloadId based on Edgar filings, 
		export file with ids to scan for keywords                                                                                      
*************************************************************************************************************/

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


/*	5. 	Nodejs: Scan 10-Ks for keywords, navigate to /nodejs/ and run: node index.js > output/keywords.csv
		The nodejs output is imported in the next step	
*************************************************************************************************************/

	
/*	6. SAS: Import keywords, create index                                                                                      
*************************************************************************************************************/

/* 	Path to nodejs output */             
filename KEYWORDS "&projectDir.nodejs\output\keywords.csv";

/* 	Keyword variable names */
%let keywordVars = SFAS133 isNotSFAS133 SFAS138 isNotSFAS138 SFAS142 isNotSFAS142 SFAS143 isNotSFAS143 SFAS157 isNotSFAS157 SFAS159 isNotSFAS159 SFAS123 isNotSFAS123 compensation isNotcompensation FIN46 isNotFIN46 FIN47 isNotFIN47 section404 isNotsection404 section401 isNotsection401 section1a isNotsection1a SFAS140 isNotSFAS140 SFAS148 isNotSFAS148 SFAS132 isNotSFAS132 SFAS158 isNotSFAS158 SFAS146 isNotSFAS146 SFAS144 isNotSFAS144 SFAS149 isNotSFAS149;
		
data mylib.c_keywords;
infile KEYWORDS dsd delimiter=","  firstobs=2 LRECL=32767 missover;
input downloadId &keywordVars;
run;

/* 	Append keywords to main dataset */
proc sql; 
	create table mylib.d_funda_keywords as select a.*, b.* from mylib.b_funda_sec a left join mylib.c_keywords b on a.downloadId = b.downloadId;
quit;

/* 	Further processing here: 
	- replace single counts with 0
	- standardize by industry-year
	- index equals the sum standardized counts  */
