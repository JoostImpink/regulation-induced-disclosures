#!/usr/bin/perl
use LWP;
use HTTP::Request;

############################################## Settings
# Directory to write the filings (make sure it exists)
$write_dir = '..\10K_filings';
#
# Filename that holds downloadIds and the urls 
# (make sure it exists in same folder as this script)
$filings = '..\perl_download_these.txt';
#######################################################

# user agent object for handling HTTP requests
my $ua = LWP::UserAgent->new;

# open file that holds all downloadIds and urls
open filingsToDownload, $filings or die $!;

# read all lines into @file array
my @file = <filingsToDownload>;
# go through each line
foreach $line (@file) { 	
	# removes newline from end of each line
	chomp($line);
	# each line holds the url and downloadId
	($url, $downloadId) = split (",", $line);
 	# full url
	$full_url = "http://www.sec.gov/Archives/" . $url;
	# Retrieve filing from Edgar
	my $request = HTTP::Request->new(GET => $full_url);
	my $response = $ua->get($full_url);
	if ($response->is_success) {
		# filing was read, write it to disk
		# write message to screen
		print "Writing file with id $downloadId \n";    
		# full path to write file
		$filename = $write_dir . "/" . $downloadId . ".txt";
		# open the new file
		open OUT, ">$filename" or die $!;
		# write and close file
		print OUT $response->content;
		close OUT;
	} else {
		# there was an error, write to error log 
		# open file to write errors, and close it
		open LOG , ">download_error_log.txt" or die $!;
		print LOG "$downloadId,error\n" ;		
		close LOG;
	}
}
