/**
 * Copyright (c) 2008-2009 Yahoo! Inc.  All rights reserved.  
 * The copyrights embodied in the content of this file are licensed by Yahoo! Inc. under 
 * the BSD (revised) open source license.
 */

YAHOO.util.Event.onDOMReady(function () {
  /**
	 * This widget is designed to be a dropin replacement for alert()
	 * Code snippet from: http://blog.davglass.com/files/yui/widget_alert/widget.alert.js
	 * Note: Slightly modified for this application
	 */
	(function () {
 	  YAHOO.namespace('widget.alert');  
 	  YAHOO.widget.alert.dlg = new YAHOO.widget.SimpleDialog('widget_alert', {
 	    visible: false,
      width: '20em',
      zIndex: 9999,
      close: false,
      fixedcenter: true,
      modal: false,
 		  underlay: "none",
      draggable: false,
      constraintoviewport: true, 
      icon: YAHOO.widget.SimpleDialog.ICON_WARN,
      buttons: [{ 
        text: 'OK', 
        handler: function () {
          this.hide();
        }
      }]
    });

    YAHOO.widget.alert.dlg.setHeader("Alert!");
    YAHOO.widget.alert.dlg.setBody('Alert body passed to window.alert'); // Bug in panel, must have a body when rendered
    YAHOO.widget.alert.dlg.render(document.body);

 	  var alert_old = window.alert;
 	  window.alert = function (str) {
 	    YAHOO.widget.alert.dlg.setBody(str);
 	    YAHOO.widget.alert.dlg.cfg.queueProperty('icon', YAHOO.widget.SimpleDialog.ICON_WARN);
 	    YAHOO.widget.alert.dlg.cfg.queueProperty('zIndex', 9999);
 	    YAHOO.widget.alert.dlg.render(document.body);
 	    if (YAHOO.widget.alert.dlg.bringToTop) {
 	        YAHOO.widget.alert.dlg.bringToTop();
 	    }
 	    YAHOO.widget.alert.dlg.show();
 	  };

 	})();
 	
 	//**************************************
 	//Begin Sideline Impl
 	//**************************************
 	
  YAHOO.namespace("TI");
	
	//The Sideline object
	YAHOO.TI.Sideline = function () {};
	//Sideline application state
	YAHOO.TI.Sideline.prototype = {
	  tabView: null,
		tabStore: [],
		showDesktopNotifications: null,
		searchRefreshRate: null,
		desktopNotificationLoader: null,
		/**
		 * Used to handle tab construction during initial app load
		 */
		setupSidelineTabs : function () {
			var sideline = this;
			sideline.getAllSidelineGroups(function(sidelineGroups) {
			  //The trends group is not in the database so it is added seperately here
  			this.tabView.addTab(new YAHOO.widget.Tab({ 
  			  label: this.buildTabText("Trends"),
  				active: false,
  				content: '<div id="trending_content" class="tweet-container">' +
  									'<p>Popular topics right now</p>' +
  									'<div id="twitter_trend_list"><p>Loading trends...<img src="images/search_in_progress.gif" alt="loading" /></p></div>' +
  									'<p id="twitter_trend_asof"></p>' +
  									'</div>'
  			}));
  			
  			//We need to open a tab for each group
  			for (var i = 0; i < sidelineGroups.rows.length; i++)  {
  			  var sidelineGroup = sidelineGroups.rows.item(i);
  			  //Collect tweets for this group and build tweet rows for this tab if we have data
  				var tweetStr = '';
  				var tabLabel = '';
  				
  				sideline.getTweets(sidelineGroup.id, function(grpTweets) {
  				  tweetStr = tweetStr+'<div id="summary-group-' + sidelineGroup.id + '" class="tweet-container summary-group-' + sidelineGroup.id + '">';
  				  if (grpTweets.rows.length > 0) {
  				    for (var j = 0; j < grpTweets.rows.length; j++) {
    				    var grpTweet = grpTweets.rows.item(j);
    				    var buttonClass, buttonTask, buttonTitle;

    						//Determine fav image and task (ie) remove + delete icon for those in the Favorites group and fav + star icon for all others
    						if (sidelineGroup.group_name === 'Favorites') {
    							buttonClass = 'delete_button';
    							buttonTask  = 'remove';
    							buttonTitle = 'Remove this Tweet';
    						} else {
    							buttonClass = 'fav_button';
    							buttonTask = 'fav';
    							buttonTitle = 'Favorite this Tweet';
    						}
  						
    						//Available fields: text,to_user_id,from_user,twitter_id,from_user_id,profile_image_url,created_at
    						tweetStr = tweetStr+ '<div class="single-tweet search-term-' + grpTweet.searches_id + ' detail-group-' + sidelineGroup.id + '" id="tweet__' + grpTweet.id + '__' + grpTweet.twitter_id + '">';
    						tweetStr = tweetStr+ 	'<div class="tweet-container-left">';
    						tweetStr = tweetStr+ 		'<img height="48" width="48" class="profile_image" src="' + grpTweet.profile_image_url + '" alt="' + grpTweet.from_user + '" />';
    						tweetStr = tweetStr+ 	'</div>';
    						tweetStr = tweetStr+ 	'<div class="tweet-container-center">';
    						tweetStr = tweetStr+ 		'<p class="tweet_text" id="db_' + grpTweet.id + '">';
    						tweetStr = tweetStr+ 			'<a title="open in browser" style="text-decoration: underline;" class="tweet_link" href="http://twitter.com/' + encodeURIComponent(grpTweet.from_user) + '">' + grpTweet.from_user + '</a>&nbsp;' + grpTweet.text;
    						tweetStr = tweetStr+ 		'</p>';
    						tweetStr = tweetStr+ 		'<p class="tweet-date">' + grpTweet.created_at + '</p>';
    						tweetStr = tweetStr+ 	'</div>';
    						tweetStr = tweetStr+ 	'<div class="tweet-container-right">';
    						tweetStr = tweetStr+		'<span title="' + buttonTitle + '" class="fav_reply_remove ' + buttonClass + '" id="' + buttonTask + '__' + grpTweet.twitter_id + '__' + grpTweet.from_user + '"></span>';
    						tweetStr = tweetStr+ 		'<span title="Reply to Tweet" class="fav_reply_remove reply_button" id="reply__' + grpTweet.twitter_id + '__' + grpTweet.from_user + '"></span>';
    						tweetStr = tweetStr+ 	'</div>';
    						tweetStr = tweetStr+ 	'<br class="clear" />'; //break inside node so it fades with node
    						tweetStr = tweetStr+ '</div>';
  						
    				  }
				    }
				    else {
				      tweetStr = tweetStr+ '<p id="emptygroup__' + sidelineGroup.id + '">This group has no search results yet!</p>';
				    }
  				});
  				
  				//Close it up
  				tweetStr = tweetStr+'</div>';
  				//Add a new tab per group
  				tabLabel = this.buildTabText(sidelineGroup.group_name);
  			  this.tabView.addTab(new YAHOO.widget.Tab({
  			    label: tabLabel,
  			    content: tweetStr,
  			    active: false
  			  }));

  				this.tabView.appendTo('tweetainer'); //Inject new tab
  			}
  			//Once all groups have been done (tabs created), continue with initialization
  			if (sidelineGroups.rows.length === i) {
  			  this.refreshTabStore();
    			this.setupNewTabButton();

    			//Update active search list with ones for the newly selected tab
    			this.tabView.addListener('activeTabChange', function (e) {
    				var grpId = sideline.getCurrentGrpId();

    				if (grpId !== 'undefined') {
    					var grpQueryStrings = sideline.getSidelineGroupQueries(grpId) || 'undefined',
    						searchStringList = YAHOO.util.Dom.get("active_search_strings");

    					//If selected tab is favs then hide the add search button.  Otherwise, update search list.
    					if (grpId === sideline.tabStore.favoritesGrpID) {
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("favs-tab-label"), "inactive", "active");
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("trends-tab-label"), "active", "inactive");

    						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'hidden');
    						searchStringList.innerHTML = '<li class="list_message">The Favorites group does not contain specific search items.' +
    														' Instead it contains a collection of your favorite search results.</li>';

    						//No search result totals for favs							
    						YAHOO.util.Dom.get("search_group_result_count").innerHTML = '';
    					} else if (grpId === sideline.tabStore.trendsGrpID) {
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("trends-tab-label"), "inactive", "active");
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("favs-tab-label"), "active", "inactive");

    						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'hidden');
    						searchStringList.innerHTML = '<li class="list_message">The Trends group does not contain specific search items.' +
    														' Instead it contains a collection of topics currently trending in Twitter.</li>';

    						//No search result totals for trends								
    						YAHOO.util.Dom.get("search_group_result_count").innerHTML = '';
    					} else {
    						//Make sure both special tabs are marked inactive
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("favs-tab-label"), "active", "inactive");
    						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("trends-tab-label"), "active", "inactive");

    						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'visible');

    						if (grpQueryStrings !== 'undefined') {
    							sideline.updateActiveSearchList(grpQueryStrings);
    						}

    						//Update selected tab label and tabStore to remove new record info and update the total reference
    						sideline.tabStore[grpId].newTweetCount = 0;
    						sideline.tabStore[grpId].nodeReference.innerHTML = sideline.buildTabText(sideline.tabStore[grpId].label, 0);

    						//Update the active search group total for the selected tab
    						YAHOO.util.Dom.get("search_group_result_count").innerHTML = 'Search Group Total: ' + sideline.tabStore[grpId].totalTweetCount;
    					}
    				}

    			});

    			this.tabView.set('activeIndex', 0);  //Make tab at index 0 active (ie) Trends
  			}
			});
		},
		/**
		 * Build/refresh data store that maintains important information about search groups/tabs
		 * Note: Called on app launch and after a new search group/tab has been added
		 */
		refreshTabStore : function() {
			//Find all the tabs and setup reference data store
			var sideline = this,
				grpIDResult,
				grpID,
				grpTweetCount,
				tabText,
				tabTextWithoutCount,
				closeButtons,
				searchGrpTabs = YAHOO.util.Selector.query('ul.yui-nav li a em');
							
			//Set tab count and result count per rotation for system notifications
			this.tabStore.tabCount = searchGrpTabs.length;
			
			//Verify tab exists in tabStore, otherwise add
			for(var t = 0; t < searchGrpTabs.length; t++) {
				tabText = this.getRawTabText(searchGrpTabs[t].innerHTML);
				
				//Add to tabStore if new and not the dynamic trends tab
				if (tabText !== 'Trends') {
					grpIDResult   = this.getGroupIdFromString(tabText);
					grpID         = Number(grpIDResult.data[0].id);
					grpTweetCount = this.getTweetCountForSearchGroup(grpID);
					if (YAHOO.lang.isUndefined(this.tabStore[grpID])) {
						this.tabStore[grpID] = {
												nodeReference: searchGrpTabs[t], 
												label: searchGrpTabs[t].innerHTML, 
												newTweetCount: 0,
												totalTweetCount: grpTweetCount
											   };	
					}
				}
			}
			
			//The favorites and trends tabs are special (we need some extra metadata)
			if (YAHOO.lang.isUndefined(this.tabStore.favoritesGrpID)) {
				var favGrpIDResult = this.getGroupIdFromString('Favorites');
				this.tabStore.favoritesGrpID = Number(favGrpIDResult.data[0].id);
			}
			if (YAHOO.lang.isUndefined(this.tabStore.trendsGrpID)) {
				this.tabStore.trendsGrpID = -1;
			}
			
			YAHOO.util.Event.on(searchGrpTabs, 'dblclick', function(e) {
				var eltarget        = YAHOO.util.Event.getTarget(e),
					selectedTabText = sideline.getRawTabText(eltarget.innerHTML);
					
				if (selectedTabText !== 'Trends' && selectedTabText !== 'Favorites') {
					YAHOO.util.Dom.get("new_search_group_title").value = selectedTabText;
					YAHOO.util.Dom.get("old_search_group_title").value = selectedTabText;
					sideline.renameSearchGrpDialog.show();
				}
			});
		},
		/**
		 * Setup basic tooltip overlay
		 */
		setupTooltip : function () {
			//Build overlay based on markup
			var cOverlay = new YAHOO.widget.Overlay("tooltip", { 
			  context: ["ctt","tl","br"],
				visible: false,
				fixedcenter: true,
				width: "300px",
				height: "auto",
				underlay: "shadow" 
			});

			cOverlay.render();
			
			YAHOO.util.Event.addListener("information", "mouseover", cOverlay.show, cOverlay, true);
			YAHOO.util.Event.addListener("information", "mouseout", cOverlay.hide, cOverlay, true);
		},
		/**
		 * Setup the YUI slider control for adjusting the search query rate
		 */
		setupRefreshRateSlider : function () {
			var bg = "slider-bg";
		  var convertedval = "slider-converted-value";
			var scaleFactor  = 18;  //Scale factor for converting the pixel offset into a real value
			var keyIncrement = 20;  //The amount the slider moves when the value is changed with the arrow
	
		  YAHOO.TI.Sideline.slider = YAHOO.widget.Slider.getHorizSlider("slider-bg", "slider-thumb", 0, 200, 20);
		  YAHOO.TI.Sideline.slider.animate = true;
			
			//Restore current setting from stored prefs and animate to proper position
			YAHOO.TI.Sideline.slider.setValue((this.searchRefreshRate / 6) * 20, false);
		
		  YAHOO.TI.Sideline.slider.getRealValue = function() {
				var rv = Math.round(this.getValue() * scaleFactor) / 60;
				if (rv === 0) {
					rv = 1; //1 min refresh is the minimum
				}
				return rv;
		  };
		
		  YAHOO.TI.Sideline.slider.subscribe("change", function(offsetFromStart) {
		    //Use the scale factor to convert the pixel offset into a real value
			  var fld = YAHOO.util.Dom.get(convertedval);
				var actualValue = YAHOO.AIR.Sideline.slider.getRealValue();
		        
				fld.innerHTML = actualValue;
		
		    //Update the title attribute to aid assistive technology
		    YAHOO.util.Dom.get(bg).title = "slider value = " + actualValue;
		  });
		},
		/**
		 * Used to assemble a simple dialog for building advanced Twitter search queries
		 */
		searchDialogBuilder : function () {
			var sideline = this;
	
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				/*
				var queryString,
					data   = this.getData(),
					title  = sideline.stripTags(YAHOO.lang.trim(data.title_of_search)), //title doesn't get the "+"
					q      = sideline.processSearchDialogData(data.q),
					ands   = sideline.processSearchDialogData(data.ands),
					phrase = sideline.processSearchDialogData(data.phrase),
					ors    = sideline.processSearchDialogData(data.ors),
					nots   = sideline.processSearchDialogData(data.nots),
					tag    = sideline.processSearchDialogData(data.tag),
					from   = sideline.processSearchDialogData(data.from),
					to     = sideline.processSearchDialogData(data.to),
					ref    = sideline.processSearchDialogData(data.ref),
					pa     = data.pa,
					na     = data.na,
					aq     = data.aq;
					
				//Clean up common input errors
				if (tag.charAt(0) === '#') {
					tag = tag.substr(1, tag.length);
				}
				if (from.charAt(0) === '@') {
					from = from.substr(1, from.length);
				}
				if (to.charAt(0) === '@') {
					to = to.substr(1, to.length);
				}
				if (ref.charAt(0) === '@') {
					ref = ref.substr(1, ref.length);
				}
				
				if (title === '') {
					alert('You must provide a title for this search query!');
					return false;
				} else if (q === '' && ands === '' && phrase === '' && ors === '' && nots === '' && tag === '' &&
						   from === '' && to === '' && ref === '' && pa === false && na === false && aq === false) {
					alert("You must enter a valid search query!  Please try again.");
					return false;
				} else {
					queryString = 'q=' + q +
									'&ands=' + ands +
									'&phrase=' + phrase +
									'&ors='    + ors +
									'&nots='   + nots +
									'&tag='    + tag +
									'&from='   + from +
									'&to='     + to +
									'&ref='    + ref +
									'&rpp='    + 100;
									
					if (pa === true) {
						queryString += '&tude[]=:)';
					}
					if (na === true) {
						queryString += '&tude[]=:(';
					}
					if (aq === true) {
						queryString += '&tude[]=?';
					}
					
					//Convert true/false to string for db
					pa = "" + pa + "";
					na = "" + na + "";
					aq = "" + aq + "";
					
					//Identify active search_id (if edit), group_id, and do save
					var searchId = YAHOO.util.Dom.get("search_to_update").value,
						grpId = sideline.getCurrentGrpId(),
						searchItemDetails = {
		 									"group_id": grpId,
										 	"search_title": title,
										 	"actual_query_string": queryString,
											"q": q,
										 	"ands": ands,
										 	"ors": ors,
											"nots": nots,
										 	"phrase": phrase,
										 	"tag": tag,
										 	"user_from": from,
										 	"user_to": to,
										 	"ref": ref,
										 	"pa": pa,
										 	"na": na,
										 	"aq": aq
		 								};
										
					//Is this a new search term or an update for an existing one?
					if (searchId === '') {
						var newQueryStringId = sideline.addSearchItem(searchItemDetails);
						
						if (newQueryStringId.data !== null) {
							//Inject new list item into the DOM
							var newLi = sideline.create("li");
							newLi.id = 'search__' + newQueryStringId.data[0].id;
							YAHOO.util.Dom.addClass(newLi, 'search_string_item');
							newLi.innerHTML = title;
							var countOfSearchItems = YAHOO.util.Dom.getElementsByClassName('search_string_item', 'li', 'active_search_strings').length;
							var lastActiveSearchItem = YAHOO.util.Dom.getLastChild('active_search_strings');
							YAHOO.util.Dom.insertAfter(newLi, lastActiveSearchItem);
							
							//If this was the first real search item then remove the stub
							if (countOfSearchItems === 'undefined' || countOfSearchItems === 0) {
								var firstChild = YAHOO.util.Dom.getFirstChild('active_search_strings');
								sideline.remove(firstChild);
							}
							
							this.hide(); //Hide the search dialog after sucessful save
							YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
						}
						else {
							alert('Unable to add new search string!  Please try again.');
						}
					} else {
						sideline.updateSearchItem(searchId, searchItemDetails);
						YAHOO.util.Dom.get('search__' + searchId).innerHTML = title; //Since the title may have changed
						this.hide(); //Hide the search dialog after sucessful save
						
						//The search has changed, cleanup old results
						sideline.removeSearchTermTweets(grpId, searchId);
						//If sideline removed everything from the group put the empty block back
						var currentSummaryGrp = YAHOO.util.Dom.get("summary-group-" + grpId);
						if (!currentSummaryGrp.hasChildNodes()) {
							currentSummaryGrp.innerHTML = '<p id="emptygroup__' + grpId + '">This group has no search results yet!</p>';
						}
						
						YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
					}
					
					sideline.doIntermediateDataRotation.call(sideline); //Run a rotation immediately
				}
				*/
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
				this.cancel();
			};
			
			var handleDelete = function () {
				/*var currentSearchId    = YAHOO.util.Dom.get('search_to_update').value,
					countOfSearchItems = YAHOO.util.Dom.getElementsByClassName('search_string_item', 'li', 'active_search_strings').length;
				
				if (currentSearchId !== '') {
					//Do the delete/fade of the search term and remove the related search results....
					sideline.removeSearchItem(currentSearchId);
					sideline.fadeThisOut(YAHOO.util.Dom.get('search__' + currentSearchId), true);
					sideline.removeSearchTermTweets(sideline.getCurrentGrpId(), currentSearchId);
					
					//If this was the last search item in the list then readd the stub
					if (countOfSearchItems === 'undefined' || countOfSearchItems <= 1) {
						var searchStringList       = YAHOO.util.Dom.get("active_search_strings");
						searchStringList.innerHTML = '<li class="list_message">This group has no searches defined!</li>';
					}
					
					YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
					this.cancel();
				}*/
			};
		
			//Instantiate the Dialog
			this.searchDialog = new YAHOO.widget.Dialog("add_search_dialog", { 
			  width : "435px",
				fixedcenter : true,
				visible : false,
				modal: true,
				draggable: false,
				underlay: "none",
				postmethod: "none",
				constraintoviewport : true,
				buttons : [ 
				  { text: "Delete", handler: handleDelete },
					{ text: "Submit", handler: handleSubmit },
					{ text: "Cancel", handler: handleCancel }
				]
			});
			
			//Render the Dialog
			this.searchDialog.render();
			
			//Prevent enter/return from hiding an incomplete dialog
			YAHOO.util.Event.addListener("add_search_dialog", "keypress", function (e) {
				if (e.keyCode && e.keyCode === 13) {
	    			YAHOO.util.Event.preventDefault(e); //Default behavior just hides the dialog
				}
	    });
			
			//Allow for simple/adv form view swapping
			YAHOO.util.Event.addListener("add_search_form", "click", function (e) {
				var eltarget        = YAHOO.util.Event.getTarget(e),
					titleNode       = YAHOO.util.Dom.get("title_of_search"),
					title           = titleNode.value; 
			
				if (eltarget.id === 'show_simple_search') {
					YAHOO.util.Event.preventDefault(e);
					YAHOO.util.Dom.get('add_search_form').reset(); //Either simple or adv, not both...
					titleNode.value = title; //Restore title after reset
					YAHOO.util.Dom.setStyle("advanced_search", "display", "none");
					YAHOO.util.Dom.setStyle("simple_search", "display", "");
				} else if (eltarget.id === 'show_advanced_search') {
					YAHOO.util.Event.preventDefault(e);
					YAHOO.util.Dom.get('add_search_form').reset(); //Either simple or adv, not both...
					titleNode.value = title; //Restore title after reset
					YAHOO.util.Dom.setStyle("simple_search", "display", "none");
					YAHOO.util.Dom.setStyle("advanced_search", "display", "");
				}
	    });
		},
		/**
		 * Used to assemble a simple dialog for gathering search group input
		 */
		searchGrpDialogBuilder : function () {
			var sideline = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				/*
				var formData = this.getData();
				var search_group_title = sideline.stripTags(YAHOO.lang.trim(formData.search_group_title));
				if (search_group_title === '') {
					alert('You must provide a title for this search group!');
					return false;
				} 
				else {
					var tabLabel,
						newGroupId = sideline.addNewSearchGroup(search_group_title);
					if (newGroupId.data !== null) {
						//Remove
						
						//New group was created so add the new tab, make it active, and replace the add tab button
						sideline.remove(YAHOO.util.Dom.get("add_new_group"));
						tabLabel = sideline.buildTabText(search_group_title);
						sideline.tabView.addTab(new YAHOO.widget.Tab({ 
														label: tabLabel,
														active: true,
														content: '<div id="summary-group-' + newGroupId.data[0].id + '" class="tweet-container summary-group-' + newGroupId.data[0].id + '">' +
																	'<p id="emptygroup__' + newGroupId.data[0].id + '">This group has no search results yet!</p><div>'
													})
												);
						
						sideline.setupNewTabButton();
						sideline.refreshTabStore();  //Refresh tabStore to pickup new tab
						
						var searchStringList       = YAHOO.util.Dom.get("active_search_strings");
						searchStringList.innerHTML = '<li class="list_message">This group has no searches defined!</li>';
						
						this.hide(); //Hide the search group dialog after sucessful save
						YAHOO.util.Dom.get('add_search_group_form').reset(); //Prepare for future use
						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'visible'); //Set to display on tab change, but if first tab this would be missing
					} else {
						alert('Unable to add new Search Group!  Please try again.');
					}
				}*/
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('add_search_group_form').reset(); //Prepare for future use
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.searchGrpDialog = new YAHOO.widget.Dialog("add_search_group_dialog", { 
			  width : "250px",
				fixedcenter : true,
				visible : false,
				modal: true,
				draggable: false,
				underlay: "none",
				postmethod: "none",
				constraintoviewport : true,
				buttons : [ 
				  { text: "Submit", handler: handleSubmit },
					{ text: "Cancel", handler: handleCancel } 
				]
			});
			
			//Render the Dialog
			this.searchGrpDialog.render();
			
			//Prevent enter/return from hiding an incomplete dialog
			YAHOO.util.Event.addListener("add_search_group_dialog", "keypress", function (e) {
				if (e.keyCode && e.keyCode === 13) {
	    			YAHOO.util.Event.preventDefault(e); //Default behavior just hides the dialog
				}
	    });
		},
		/**
		 * Used to assemble a simple dialog for renaming an existing search group
		 */
		renameSearchGrpDialogBuilder : function () {
			var sideline = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				/*
				var formData = this.getData(),
					new_search_group_title = sideline.stripTags(YAHOO.lang.trim(formData.new_search_group_title)),
					old_search_group_title = sideline.stripTags(YAHOO.lang.trim(formData.old_search_group_title));
				
				if (new_search_group_title === '' || (new_search_group_title === old_search_group_title)) {
					alert('You must provide a new title for this search group!');
					return false;
				} else {
					//Update group name in the database, the tabStore, and on the tab itself
					var newTabLabel          = sideline.buildTabText(new_search_group_title),
						updatedSearchGroupId = sideline.updateSearchGroup(old_search_group_title, new_search_group_title);
					
					sideline.tabStore[updatedSearchGroupId].label = newTabLabel;
					sideline.tabStore[updatedSearchGroupId].nodeReference.innerHTML = newTabLabel;
					sideline.refreshTabStore();  //Refresh tabStore to pickup tab changes
					this.hide(); //Hide the search group dialog after sucessful save
					YAHOO.util.Dom.get('rename_search_group_form').reset(); //Prepare form for future use
				}*/
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('rename_search_group_form').reset(); //Prepare form for future use
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.renameSearchGrpDialog = new YAHOO.widget.Dialog("rename_search_group_dialog", { 
			  width : "250px",
				fixedcenter : true,
				visible : false,
				modal: true,
				draggable: false,
				underlay: "none",
				postmethod: "none",
				constraintoviewport : true,
				buttons : [ 
				  { text: "Submit", handler: handleSubmit },
					{ text: "Cancel", handler: handleCancel } 
				]
			});
			
			//Render the Dialog
			this.renameSearchGrpDialog.render();
			
			//Prevent enter/return from hiding an incomplete dialog
			YAHOO.util.Event.addListener("rename_search_group_dialog", "keypress", function (e) {
				if (e.keyCode && e.keyCode === 13) {
	    			YAHOO.util.Event.preventDefault(e); //Default behavior just hides the dialog
				}
	    });
		},
		/**
		 * Used to assemble a simple dialog for search group delete confirmation
		 */
		searchGrpRemovalDialog : function () {
			var sideline = this;
			
			//Define various event handlers for this simpledialog
			var handleYes = function () {
				//Do the delete....
				/*var activeTab = YAHOO.util.Selector.query('li.selected a em'),
				tabText   = activeTab[0].innerHTML;
			
				if (tabText !== 'Favorites') {
					var grpId        = sideline.getCurrentGrpId(),
						tabId        = 'summary-group-' + grpId,
						tabContainer = YAHOO.util.Dom.get(tabId);
					if (grpId !== 'undefined') {
						//Remove tab data (i.e.) the search queries, results, and group
						sideline.removeTabData(grpId);
						
						//Remove event listeners and references to this tab and then physically remove it
						YAHOO.util.Event.purgeElement(tabContainer, true);
						sideline.tabStore[grpId].nodeReference = null;
						sideline.tabView.removeTab(sideline.tabView.get('activeTab'));
					}
				} else {
					alert('The favorites group cannot be removed!');
				}
				
				this.hide();
				sideline.refreshTabStore();
				*/
			};
			var handleNo = function () {
				this.hide();
			};
		
			//Instantiate the Dialog
			this.searchGrpRemoval = new YAHOO.widget.SimpleDialog("searchGrpRemoval", { 
			  width: "300px",
				fixedcenter: true,
				visible: false,
				draggable: false,
				underlay: "none",
				modal: true,
				close: true,
				text: "Are you sure you want to remove this search group?",
				icon: YAHOO.widget.SimpleDialog.ICON_WARN,
				constraintoviewport: true,
				buttons: [ 
				  { text: "Yes", handler: handleYes },
					{ text: "No",  handler: handleNo } 
				]
			});
			this.searchGrpRemoval.setHeader("Confirmation Dialog");
			this.searchGrpRemoval.render("search_item_simpledialog");
		},
		/**
		 * Used to assemble a dialog for adjusting the API query rate
		 */
		searchRateDialogBuilder : function () {
			var sideline = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Save the new rate and fire a rotation (this also resets the timers with the new refresh rate)
				/*sideline.searchRefreshRate = Number(YAHOO.lang.trim(YAHOO.util.Dom.get("slider-converted-value").innerHTML));
				sideline.saveUserPreferences();
				sideline.doIntermediateDataRotation.call(sideline);
				this.cancel(); //close the dialog
				*/
			};
			
			var handleCancel = function () {
				//Restore current setting from stored prefs in cause they changed, but did not save
				YAHOO.TI.Sideline.slider.setValue((sideline.searchRefreshRate / 6) * 20, false);
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.searchRateDialog = new YAHOO.widget.Dialog("search_rate_dialog", { 
			  width : "250px",
				fixedcenter : true,
				visible : false,
				modal: true,
				draggable: false,
				underlay: "none",
				postmethod: "none",
				constraintoviewport : true,
				buttons : [ 
				  { text: "Submit", handler: handleSubmit },
					{ text: "Cancel", handler: handleCancel } 
				]
			});
			
			//Render the Dialog
			this.searchRateDialog.render();
			
			//Prevent enter/return from hiding an incomplete dialog
			YAHOO.util.Event.addListener("search_rate_dialog", "keypress", function (e) {
				if (e.keyCode && e.keyCode === 13) {
	    			YAHOO.util.Event.preventDefault(e); //Default behavior just hides the dialog
				}
	    });
		},
		optionsMenuBuilder: function() {
		  var sideline = this;
		  //Construct the options menu
  		YAHOO.util.Event.onContentReady("options_menu", function () {
  			//Menu item selection handler
  			function onMenuItemClick(p_sType, p_aArgs, p_oValue){
  				//Gather details about the selected menu entry
  				var currentProperty = this.cfg.getProperty("checked"), itemTitle = this.value;

  				if (itemTitle === 'notification') {
  					this.cfg.setProperty("checked", !currentProperty);
  					sideline.showDesktopNotifications = Number(!currentProperty);
  					sideline.saveUserPreferences();
  				} else if (itemTitle === 'import') {
  					sideline.importSearchGrps(); //Run the local file import process
  				} else if (itemTitle === 'help') {
  					sideline.openInBrowser('http://sideline.yahoo.com/help.php');
  				} else if (itemTitle === 'rate') {
  					sideline.searchRateDialog.show();
  				}
  			}

  			//Create an array of YAHOO.widget.MenuItem configuration properties
  			var aMenuButtonMenu = [
  				{ text: "Import Search Groups", value: "import", onclick: { fn: onMenuItemClick } },
  	      { text: "Show Notifications", value: "notification", checked: !!sideline.showDesktopNotifications, onclick: { fn: onMenuItemClick } },
  				{ text: "Adjust Refresh Rate", value: "rate", onclick: { fn: onMenuItemClick } },
  				{ text: "Help", value: "help", onclick: { fn: onMenuItemClick } }
  			];

  			//Instantiate a Menu Button using the array of YAHOO.widget.MenuItem 
  			var oMenuButton = new YAHOO.widget.Button({ 
  			  type: "menu", 
  				label: "Options", 
  				name: "menubutton", 
  				menu: aMenuButtonMenu, 
  				container: this 
  			});
  		});
		},
		/**
		 * Used to get tab text without the tweet count and/or close button html
		 */
		getRawTabText : function(tabTextString) {
			var tt = tabTextString.replace(/<span.*><\/span>/, ''); //deal with tab buttons
			tt = YAHOO.lang.trim(tt.replace(/\(\d+\)/gi, '')); //deal with tweet count
			return tt;
		},
		/**
		 * Used to construct the proper tab label with optional button and new tweet count indicator
		 * @param {Object} tabText
		 * @param {Object} newTweetCount
		 * @param {Object} closeButton
		 */
		buildTabText : function(tabText, newTweetCount) {
			var cleanTabText = this.getRawTabText(tabText),
				tabLabel     = cleanTabText;
				
			if (!YAHOO.lang.isUndefined(newTweetCount) && newTweetCount > 0) {
				tabLabel += ' (' + newTweetCount + ')';
			}
			
			//All tabs except for trends ands favs get a close button
			if (cleanTabText !== 'Trends' && cleanTabText !== 'Favorites') {
				tabLabel += '<span class="close-search-group"></span>';
			} else if (cleanTabText === 'Trends') {
				tabLabel += '<span id="trends-tab-label" class="active"></span>';
			} else if (cleanTabText === 'Favorites') {
				tabLabel += '<span id="favs-tab-label" class="inactive"></span>';
			}
			
			return tabLabel;
		}
	};
	
	//Sideline utility operations
	YAHOO.TI.SidelineUtil = function () {};
	YAHOO.TI.SidelineUtil.prototype = {
	  openInBrowser: function(url) {
	    Titanium.Desktop.openURL(url);
	  }
	};
	
	//Sideline database operations
	YAHOO.TI.SidelineDB = function () {};
	YAHOO.TI.SidelineDB.prototype = {
	  db: null,
	  doQuery: function(sql,sqlParameters,success,error) {
	    //Provide defaults if needed 
		  if (typeof sql === 'undefined') {
		    throw "SQL Query string is required, dummy.";
		  }
		  if (typeof sqlParameters === 'undefined') {
		    sqlParameters = [];
		  }
		  if (typeof success === 'undefined') {
		    success = function(tx,result) {};
		  }
		  if (typeof error === 'undefined') {
		    error = function(tx,error) {
		      Titanium.API.debug(error+": "+error.message);
		      window.console.log("Error doing query: "+sql);
		      window.console.log(error+": "+error.message);
		    };
		  }
		  
		  //Execute the SQL and call the callbacks
			this.db.transaction(function(tx) {
	      tx.executeSql(sql,sqlParameters,success,error);
	    });
	  },
	  initDb: function(callback) {
	    var sideline = this;
	    var sql = {
  		  createSearchGroups: "CREATE TABLE IF NOT EXISTS search_groups(id INTEGER PRIMARY KEY NOT NULL, group_name TEXT NOT NULL,active TEXT NOT NULL DEFAULT 'Y');",
  	    createSearches: "CREATE TABLE IF NOT EXISTS searches(id INTEGER PRIMARY KEY NOT NULL, group_id INTEGER NOT NULL, search_title TEXT NOT NULL,actual_query_string TEXT,q TEXT,ands TEXT,ors TEXT,nots TEXT,phrase TEXT,tag TEXT,user_from TEXT,user_to TEXT,ref TEXT,pa TEXT,na TEXT,aq TEXT,twitter_starting_point INTEGER,active TEXT DEFAULT 'Y');",
        createTweets: "CREATE TABLE IF NOT EXISTS tweets(id INTEGER PRIMARY KEY NOT NULL,text TEXT,to_user_id INTEGER,from_user TEXT,twitter_id INTEGER,from_user_id INTEGER,profile_image_url TEXT,created_at TEXT,searches_id INTEGER,sideline_group_id INTEGER,loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
        createUserPreferences: "CREATE TABLE IF NOT EXISTS user_preferences(show_desktop_notifications INTEGER NOT NULL DEFAULT 1, refresh_rate INTEGER NOT NULL DEFAULT 1);",
        selectAllSearchGroups: "SELECT * FROM search_groups",
        insertGroup: "INSERT INTO search_groups(id,group_name,active) VALUES (1,'Favorites', 'Y');"
  		};
	    //begin the daisy chain of table create statments and initialization... grr...
  		sideline.doQuery(sql.createSearchGroups,[],function(tx,result){
  		  sideline.doQuery(sql.createSearches,[],function(tx,result){
          sideline.doQuery(sql.createTweets,[],function(tx,result){
            sideline.doQuery(sql.createUserPreferences,[],function(tx,result){
              sideline.doQuery(sql.selectAllSearchGroups,[],function(tx,result) {
                //Insert initial "Favorites" group is need be
                if (result.rows.length > 0) {
                  callback.call(sideline);
                }
                else {
                  sideline.doQuery(sql.insertGroup,[],function(tx,result){
                    callback.call(sideline);
              		});
                }
              });
        		});
      		});
    		});
  		});
	  },
	  getUserPreferences: function(callback) {
	    var sideline = this;
	    var sql = "SELECT * FROM user_preferences";
	    sideline.doQuery(sql,[],function(tx,results) {
	      callback.call(sideline,results);
	    });
	  },
	  getAllSidelineGroups:function(callback) {
	    var sideline = this;
	    var sql = "SELECT id, group_name FROM search_groups WHERE active='Y' ORDER BY id ASC";
	    sideline.doQuery(sql,[],function(tx,results) {
	      callback.call(sideline,results);
	    });
	  },
	  getTweets: function(group_id,callback) {
	    var sideline = this;
	    var sql = "SELECT id, text, from_user, twitter_id, profile_image_url, created_at, sideline_group_id, searches_id FROM tweets" +
					        " WHERE sideline_group_id = ?" +
					        " ORDER BY twitter_id DESC";
	    sideline.doQuery(sql,[group_id],function(tx,results) {
	      callback.call(sideline,results);
	    });
	  }
	};
	
	//Initialize the application
	(function() {
	  var sideline = new YAHOO.TI.Sideline();
		YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineDB);
		YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineUtil);
		
		//Initialize database
		sideline.db = openDatabase("ti_sideline","1.0", "Sideline", 200000);
		sideline.initDb(function() {
		  //Initialize user preferences
		  sideline.getUserPreferences(function(prefs) {
		    if (!YAHOO.lang.isNull(prefs) && !YAHOO.lang.isNull(prefs.rows) && prefs.rows.length > 0) {
		      var pref = prefs.rows.item(0);
    			sideline.showDesktopNotifications = pref.show_desktop_notifications;
    			sideline.searchRefreshRate = pref.refresh_rate;
    		} 
    		else {
    			//Defaults
    			sideline.showDesktopNotifications = 1;
    			sideline.searchRefreshRate = 1;
    		}
    		
		    //Initialize UI
		    sideline.tabView = new YAHOO.widget.TabView();
    		sideline.setupSidelineTabs();
		    sideline.setupTooltip();
		    sideline.setupRefreshRateSlider();
		    sideline.searchDialogBuilder();
		    sideline.searchGrpDialogBuilder();
    		sideline.renameSearchGrpDialogBuilder();
    		sideline.searchGrpRemovalDialog();
    		sideline.searchRateDialogBuilder();
    		sideline.optionsMenuBuilder();
    	});
		});
	})();
});