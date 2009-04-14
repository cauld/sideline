# Titanium Sideline #

This project is a derivative work of [Yahoo!'s Sideline Twitter Utility](http://sideline.yahoo.com).
This application substitutes the Adobe Integrated Runtime (AIR) with the open source 
[Appcelerator Titanium](http://titaniumapp.com) runtime for desktop applications developed with
Open Web technologies.

Yahoo!, Y! and their respective logos are the trademarks or registered trademarks of Yahoo! Inc.

[Join the Appcelerator Developer Community](http://community.appcelerator.org) to get more information
and support building apps for Titanium.  Code Strong!


# Original README From Yahoo! #

Copyright (c) 2008-2009 Yahoo! Inc.  All rights reserved.  
The copyrights embodied in the content of this file are licensed by Yahoo! Inc. under 
the BSD (revised) open source license.

# Sideline README #

The official Sideline website is located at [http://sideline.yahoo.com](http://sideline.yahoo.com).  For more 
background on Sideline reference the following [YUI Blog post](http://yuiblog.com/blog/2009/03/31/sideline-beta-released).

## Contact Info
* Twitter - http://twitter.com/ysideline
* Email   - sideline@yahoo-inc.com
* Github  - http://github.com/cauld/sideline/tree/master

## FAQ ##

1. How often are my searches terms updated? - By default each search term is refreshed every 
minute.  You can adjust the query rate under the options menu.

2. How often is the trend data updated? - Sideline refreshes its trend data every 5 minutes.  It
will grab whatever is the latest data available from Twitter at that time.

3. Can I imported pre-defined search groups and related terms? - Sideline does support 
importing of pre-defined search groups.  This is useful for loading up a large amount 
of specific search groups and custom search queries without laboring through the UI each 
time.  To use this create a basic text file with a .ssf extension (Sideline Search Format).  In 
that text file you will define your search groups and custom searches using 
[JavaScript Object Notation (JSON)](http://en.wikipedia.org/wiki/JSON).  There is 
a example file included with the Sideline source code called sample.ssf.  That example 
demonstrates defining two search groups and several different searches within each.

### Additional Notes
* Sideline does phone home on startup.  This is done as a safety precaution so 
that we can put the application in maintenance mode in the event that a security issue 
is identified.  We'd take it out if we could, but our security policy prohibits this.