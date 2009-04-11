/**
 * Copyright (c) 2008-2009 Yahoo! Inc.  All rights reserved.  
 * The copyrights embodied in the content of this file are licensed by Yahoo! Inc. under 
 * the BSD (revised) open source license.
 */

YAHOO.util.Event.onDOMReady(function () {
	YAHOO.namespace("TI");
	
	YAHOO.TI.Sideline = function () {
		var rotationTimer,
			rotationJobCount = 0,
			rotationTotal    = 0;
	};
	YAHOO.TI.Sideline.prototype = {
		tabView: null,
		tabStore: [],
		showDesktopNotifications: null,
		searchRefreshRate: null,
		desktopNotificationLoader: null,
		slider: null,
		searchRateDialog: null,
		setupMenu: function() {
		  var sideline = this;
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
  				  alert("Search group import not implemented yet...");
  					//sideline.importSearchGrps(); //Run the local file import process
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
		setupTooltip: function() {
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
			var bg = "slider-bg",
		    convertedval = "slider-converted-value",
				scaleFactor  = 18,  //Scale factor for converting the pixel offset into a real value
				keyIncrement = 20;  //The amount the slider moves when the value is changed with the arrow
	
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
				var fld = YAHOO.util.Dom.get(convertedval),
					actualValue = YAHOO.TI.Sideline.slider.getRealValue();
		        
				fld.innerHTML = actualValue;
		
		    //Update the title attribute to aid assistive technology
		    YAHOO.util.Dom.get(bg).title = "slider value = " + actualValue;
		  });
		},
		setupSearchRateDialog: function() {
		  var sideline = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Save the new rate and fire a rotation (this also resets the timers with the new refresh rate)
				sideline.searchRefreshRate = Number(YAHOO.lang.trim(YAHOO.util.Dom.get("slider-converted-value").innerHTML));
				sideline.saveUserPreferences();
				//sideline.doIntermediateDataRotation.call(sideline);
				this.cancel(); //close the dialog
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
		setupTabs: function() {
		  var sideline = this;
		  //Setup the trends tab - this is not in the database
			sideline.tabView.addTab(new YAHOO.widget.Tab({ 
			  label: this.buildTabText("Trends"),
				active: false,
				content: '<div id="trending_content" class="tweet-container">' +
								  '<p>Popular topics right now</p>' +
									'<div id="twitter_trend_list"><p>Loading trends...<img src="images/search_in_progress.gif" alt="loading" /></p></div>' +
									'<p id="twitter_trend_asof"></p>' +
									'</div>'
			}));
			
			sideline.getAllSidelineGroups(function(sidelineGroups) {
			  //We need to open a tab for each group
  			for (var i = 0; i < sidelineGroups.rows.length; i++) {
  			  
  				//Collect tweets for this group and build tweet rows for this tab if we have data
  				var tweetStr = '';
  				var tweetStrParts = [];
  				var tabLabel = '';
  				var grpTweets = null;//this.getTweets(sidelineGroups.data[i].id);				

  				tweetStrParts[tweetStrParts.length] = '<div id="summary-group-' + sidelineGroups.rows.item(i).id + '" class="tweet-container summary-group-' + sidelineGroups.rows.item(i).id + '">';
  				if (false) {// (grpTweets.data !== null) {
  				  /*
  					var c = 0, j, numTweets = grpTweets.data.length;
  					for (j = 0; j < numTweets; j++) {
  						var buttonClass, buttonTask, buttonTitle;

  						//Determine fav image and task (ie) remove + delete icon for those in the Favorites group and fav + star icon for all others
  						if (sidelineGroups.data[i].group_name === 'Favorites') {
  							buttonClass = 'delete_button';
  							buttonTask  = 'remove';
  							buttonTitle = 'Remove this Tweet';
  						} else {
  							buttonClass = 'fav_button';
  							buttonTask = 'fav';
  							buttonTitle = 'Favorite this Tweet';
  						}

  						//Available fields: text,to_user_id,from_user,twitter_id,from_user_id,profile_image_url,created_at
  						tweetStrParts[tweetStrParts.length] = '<div class="single-tweet search-term-' + grpTweets.data[j].searches_id + ' detail-group-' + sidelineGroups.data[i].id + '" id="tweet__' + grpTweets.data[j].id + '__' + grpTweets.data[j].twitter_id + '">';
  						tweetStrParts[tweetStrParts.length] = 	'<div class="tweet-container-left">';
  						tweetStrParts[tweetStrParts.length] = 		'<img height="48" width="48" class="profile_image" src="' + grpTweets.data[j].profile_image_url + '" alt="' + grpTweets.data[j].from_user + '" />';
  						tweetStrParts[tweetStrParts.length] = 	'</div>';
  						tweetStrParts[tweetStrParts.length] = 	'<div class="tweet-container-center">';
  						tweetStrParts[tweetStrParts.length] = 		'<p class="tweet_text" id="db_' + grpTweets.data[j].id + '">';
  						tweetStrParts[tweetStrParts.length] = 			'<a title="open in browser" style="text-decoration: underline;" class="tweet_link" href="http://twitter.com/' + encodeURIComponent(grpTweets.data[j].from_user) + '">' + grpTweets.data[j].from_user + '</a>&nbsp;' + grpTweets.data[j].text;
  						tweetStrParts[tweetStrParts.length] = 		'</p>';
  						tweetStrParts[tweetStrParts.length] = 		'<p class="tweet-date">' + grpTweets.data[j].created_at + '</p>';
  						tweetStrParts[tweetStrParts.length] = 	'</div>';
  						tweetStrParts[tweetStrParts.length] = 	'<div class="tweet-container-right">';
  						tweetStrParts[tweetStrParts.length] =		'<span title="' + buttonTitle + '" class="fav_reply_remove ' + buttonClass + '" id="' + buttonTask + '__' + grpTweets.data[j].twitter_id + '__' + grpTweets.data[j].from_user + '"></span>';
  						tweetStrParts[tweetStrParts.length] = 		'<span title="Reply to Tweet" class="fav_reply_remove reply_button" id="reply__' + grpTweets.data[j].twitter_id + '__' + grpTweets.data[j].from_user + '"></span>';
  						tweetStrParts[tweetStrParts.length] = 	'</div>';
  						tweetStrParts[tweetStrParts.length] = 	'<br class="clear" />'; //break inside node so it fades with node
  						tweetStrParts[tweetStrParts.length] = '</div>';
  					}
  					*/
  				} 
  				else {
  					tweetStrParts[tweetStrParts.length] = '<p id="emptygroup__' + sidelineGroups.rows.item(i).id + '">This group has no search results yet!</p>';
  				}

  				//Close it up
  				tweetStrParts[tweetStrParts.length] = '</div>';
  				//Pull it all back together
  				tweetStr = tweetStrParts.join("");

  				//Add a new tab per group
  				tabLabel = sideline.buildTabText(sidelineGroups.rows.item(i).group_name);
  			  sideline.tabView.addTab(new YAHOO.widget.Tab({
  			    label: tabLabel,
  			    content: tweetStr,
  			    active: false
  			  }));
  			}

  			sideline.refreshTabStore();
  			sideline.setupNewTabButton();

  			//Update active search list with ones for the newly selected tab
  			sideline.tabView.addListener('activeTabChange', function (e) {
  			  /*
  				var grpId = that.getCurrentGrpId();

  				if (grpId !== 'undefined') {
  					var grpQueryStrings = that.getSidelineGroupQueries(grpId) || 'undefined',
  						searchStringList = YAHOO.util.Dom.get("active_search_strings");

  					//If selected tab is favs then hide the add search button.  Otherwise, update search list.
  					if (grpId === that.tabStore.favoritesGrpID) {
  						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("favs-tab-label"), "inactive", "active");
  						YAHOO.util.Dom.replaceClass(YAHOO.util.Dom.get("trends-tab-label"), "active", "inactive");

  						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'hidden');
  						searchStringList.innerHTML = '<li class="list_message">The Favorites group does not contain specific search items.' +
  														' Instead it contains a collection of your favorite search results.</li>';

  						//No search result totals for favs							
  						YAHOO.util.Dom.get("search_group_result_count").innerHTML = '';
  					} else if (grpId === that.tabStore.trendsGrpID) {
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
  							that.updateActiveSearchList(grpQueryStrings);
  						}

  						//Update selected tab label and tabStore to remove new record info and update the total reference
  						that.tabStore[grpId].newTweetCount = 0;
  						that.tabStore[grpId].nodeReference.innerHTML = that.buildTabText(that.tabStore[grpId].label, 0);

  						//Update the active search group total for the selected tab
  						YAHOO.util.Dom.get("search_group_result_count").innerHTML = 'Search Group Total: ' + that.tabStore[grpId].totalTweetCount;
  					}
  				}
          */
  			});
			});
			
			this.tabView.appendTo('tweetainer');
			this.tabView.set('activeIndex', 0);  //Make tab at index 0 active (ie) Trends
		},
		setupNewTabButton : function () {
			var newTabButton,
				lastTab = YAHOO.util.Dom.getLastChild(YAHOO.util.Dom.getElementsByClassName("yui-nav", "ul", "tweetainer")[0]);
		    	
			newTabButton = this.create("img");
			newTabButton.id = 'add_new_group';
		    newTabButton.src = 'images/add_search_group.png';
			YAHOO.util.Dom.addClass(newTabButton, 'new-tab-button');
			YAHOO.util.Dom.insertAfter(newTabButton, lastTab);
			YAHOO.util.Event.on('add_new_group', 'click', function() {
				this.searchGrpDialog.show();
			}, this, true);
		},
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
			  sideline.getGroupIdFromString(tabText,function(grpIDResult) {
			    //Add to tabStore if new and not the dynamic trends tab
  				if (tabText !== 'Trends' && grpIDResult.rows.length > 0) {
  					grpID = Number(grpIDResult.rows.item(0).id);
  					sideline.getTweetCountForSearchGroup(grpID, function(grpTweetCount) {
  					  if (YAHOO.lang.isUndefined(sideline.tabStore[grpID])) {
    						sideline.tabStore[grpID] = {
    							nodeReference: searchGrpTabs[t], 
    							label: tabText, 
    							newTweetCount: 0,
    							totalTweetCount: grpTweetCount
    						};	
    					}
  					});
  				}
			  });
			}
			
			//The favorites and trends tabs are special (we need some extra metadata)
			if (YAHOO.lang.isUndefined(this.tabStore.favoritesGrpID)) {
			  sideline.getGroupIdFromString('Favorites',function(favGrpIDResult) {
			     sideline.tabStore.favoritesGrpID = Number(favGrpIDResult.rows.item(0).id);
			  });
			}
			if (YAHOO.lang.isUndefined(this.tabStore.trendsGrpID)) {
				sideline.tabStore.trendsGrpID = -1;
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
		},
	};
	
	/**
	 * Sideline misc utility functions
	 */
	YAHOO.TI.SidelineUtil = function () {};
	YAHOO.TI.SidelineUtil.prototype = {
		/**
		 * Used open links in the default browser
		 * @param {Object} url
		 */
		openInBrowser : function (url) {
			Titanium.Desktop.openURL(url);
		},
		dataRotation: function() {
		  
		},
		getTwitterTrends: function() {
		  try {
				this.fetchExternalJSONData(function(data) {
				  if (YAHOO.lang.isObject(data) && YAHOO.lang.isObject(data.trends) && data.trends.length > 0) {
    				var trendData               = '',
    					trendDataParts          = [],
    					trendsAsOfDateTime      = new Date(data.as_of),
    					trendsAsOfDateTimeLocal = trendsAsOfDateTime.toLocaleString(),
    					twitterTrendList        = YAHOO.util.Dom.get("twitter_trend_list"),
    					twitterTrendAsOfNode    = YAHOO.util.Dom.get("twitter_trend_asof");

    				//Assemble and replace trend list
    				for (var i = 0; i < data.trends.length; i++) {
    					trendDataParts[i] = '<div class="trend_node">' +
    											'<div class="trend_preview_header">' +
    												'<img class="trend_arrow closed" src="../images/closed_arrow.png" alt="closed" />' +
    												'<span class="trend_title">&nbsp;' + data.trends[i].name + '</span>' +
    												'<a title="' + data.trends[i].name + '" class="trend_item" href="' + data.trends[i].url + '"></a>' +
    											'</div>' +
    											'<div id="trend_item_' + i + '" class="trend_preview_container" rel="' + data.trends[i].url + '&rpp=3' + '"></div>' +
    										'</div>';
    				}

    				trendData = trendDataParts.join("");
    				twitterTrendList.innerHTML = trendData;
    				twitterTrendAsOfNode.innerHTML = 'Note: these are as of ' + trendsAsOfDateTimeLocal;
    			}
				}, 'http://search.twitter.com/trends.json');
			} catch(e) {}
		},
		handleTrendEvents: function(e, obj) {
			var eltarget = YAHOO.util.Event.getTarget(e);
				
			//Was it a trend arrow (preview) click
			if (YAHOO.util.Dom.hasClass(eltarget, "trend_arrow")) {
				var	trendPreviewContainer = YAHOO.util.Dom.getNextSibling(eltarget.parentNode),
				trendItemID               = YAHOO.util.Dom.getAttribute(trendPreviewContainer, "id"),
				trendSearchURL            = YAHOO.util.Dom.getAttribute(trendPreviewContainer, "rel"),
				trendJSONSearchURL        = trendSearchURL.replace('http://search.twitter.com/search?', 'http://search.twitter.com/search.json?');
			
				if (YAHOO.util.Dom.hasClass(eltarget, "closed")) {
					eltarget.setAttribute("src", "../images/open_arrow.png");
					trendPreviewContainer.innerHTML = '<img src="../images/search_in_progress.gif" alt="search in progress" />';
					YAHOO.util.Dom.replaceClass(eltarget, "closed", "open");
					YAHOO.util.Dom.setStyle(trendPreviewContainer, "display", "block");
					
					var req = new XMLHttpRequest();
				   	req.onreadystatechange = function () {
				        if (req.readyState === 4) {
							//Parsing JSON strings can throw a SyntaxError exception, so we wrap the call in a try catch block
							try {
								var jData = YAHOO.lang.JSON.parse(req.responseText);
								obj.updateTrendPreview(jData, trendItemID, obj.tabStore.trendsGrpID);
							} 
							catch (e) {}
				        }
				    };
				    req.open('GET', trendJSONSearchURL, true);
				    req.send(null);
				} else {
					eltarget.setAttribute("src", "../images/closed_arrow.png");
					YAHOO.util.Dom.replaceClass(eltarget, "open", "closed");
					YAHOO.util.Dom.setStyle(trendPreviewContainer, "display", "none");
				}
			} else if (YAHOO.util.Dom.hasClass(eltarget, 'trend_item')) {
				//It was a click to add a new trend group
				/*
				YAHOO.util.Event.preventDefault(e);
				
				var tabLabel,
					trendSearchItem,
					trendSrc          = eltarget.href, //(ex) http://search.twitter.com/search?q=%23foo
 					trendSrcSplit     = trendSrc.split("?q="),
					trendQueryString  = decodeURIComponent(trendSrcSplit[1]), //(ex) #foo
					trendTitle        = eltarget.title,
					trendGrpIDResult  = this.addNewSearchGroup(trendTitle),
					actualQueryString = 'q=' + trendQueryString + '&ands=&phrase=&ors=&nots=&tag=&from=&to=&ref=&rpp=100';
				
				if (trendGrpIDResult.data !== null) {
					trendSearchItem = {
						group_id: trendGrpIDResult.data[0].id,
						search_title: trendTitle,
						actual_query_string: actualQueryString,
						q: trendQueryString,
						ands: '',
						ors: '',
						nots: '',
						phrase: '',
						tag: '',
						user_from: '',
						user_to: '',
						ref: '',
						pa: 'false',
						na: 'false',
						aq: 'false'
					};
					
					this.addSearchItem(trendSearchItem);
					
					//New group was created so add the tab and make it active
					tabLabel = this.buildTabText(trendTitle);
					this.tabView.addTab(new YAHOO.widget.Tab({ 
													label: tabLabel,
													active: false,
													content: '<div id="summary-group-' + trendGrpIDResult.data[0].id + '" class="tweet-container summary-group-' + trendGrpIDResult.data[0].id + '">' +
																'<p id="emptygroup__' + trendGrpIDResult.data[0].id + '">This group has no search results yet!</p><div>'
												})
											);
											
					//Cache the new tab details, update click handlers, and set active tab to the newly added tab
					this.remove(YAHOO.util.Dom.get("add_new_group"));
					this.refreshTabStore();
					this.setupNewTabButton();
					//Note: We set this way instead of in addTab to make sure the activeTabChange event fires
					this.tabView.set('activeIndex', this.tabStore.tabCount - 1);
					
					//Run rotation now
					this.doIntermediateDataRotation();
				}
				*/
			}
		},
		updateTrendPreview : function(jData, domid, group_id) {
			var trendText,
				tweetStr,
				tweetStrParts = [],
				trendPreviewNode = YAHOO.util.Dom.get(domid);
			
			for(var i = 0; i < jData.results.length; i++) {
				trendText = jData.results[i].text;
				//Replace link-look-alikes
				trendText = trendText.replace(/((\w+):\/\/[\S]+\b)/gim, '<a title="open in browser" class="tweet_link" href="$1" target="_blank">$1</a>');
				//Replace replies (i.e.) @someone
				trendText = trendText.replace(/@(\w+)/gim, '<a title="open in browser" class="tweet_link" href="http://twitter.com/$1" target="_blank">@$1</a>');
				
				tweetStrParts[tweetStrParts.length] = '<div>';
				tweetStrParts[tweetStrParts.length] = 	'<div class="tweet-preview-container-left">';
				tweetStrParts[tweetStrParts.length] = 		'<img height="48" width="48" class="profile_image" src="' + jData.results[i].profile_image_url + '" alt="' + jData.results[i].from_user + '" />';
				tweetStrParts[tweetStrParts.length] = 	'</div>';
				tweetStrParts[tweetStrParts.length] = 	'<div class="tweet-preview-container-center">';
				tweetStrParts[tweetStrParts.length] = 		'<p class="tweet_text" id="db_' + jData.results[i].id + '">';
				tweetStrParts[tweetStrParts.length] = 			'<a title="open in browser" style="text-decoration: underline;" class="tweet_link" href="http://twitter.com/' + encodeURIComponent(jData.results[i].from_user) + '">' + jData.results[i].from_user + '</a>&nbsp;' + trendText;
				tweetStrParts[tweetStrParts.length] = 		'</p>';
				tweetStrParts[tweetStrParts.length] = 		'<p class="tweet-date">' + jData.results[i].created_at + '</p>';
				tweetStrParts[tweetStrParts.length] = 	'</div>';
				tweetStrParts[tweetStrParts.length] = 	'<br class="clear" />'; //break inside node so it fades with node
				tweetStrParts[tweetStrParts.length] = '</div>';
				tweetStrParts[tweetStrParts.length] = '<br class="clear" />';
			}
			
			tweetStr = tweetStrParts.join("");
			trendPreviewNode.innerHTML = tweetStr;
		},
		fetchExternalJSONData : function (callback, url) {
			var sideline = this,
				req = new XMLHttpRequest();
		   	req.onreadystatechange = function () { 
		        if (req.readyState === 4) {
					//Parsing JSON strings can throw a SyntaxError exception, so we wrap the call in a try catch block
					try {
						var jData = YAHOO.lang.JSON.parse(req.responseText);
						callback.call(sideline, jData);
					}
					catch (e) {
						air.trace("Unabled to parse JSON");
					}
		        }
		    };
					
		    req.open('GET', url, true);
		    req.send(null); 
		},
		/**
		 * Data rotation progress indicator
		 * @param status (ie) 1=on and 2=off
		 */
		doProgressIndicator : function (status) {
			if (status === 1) {
				YAHOO.util.Dom.setStyle('search_progress_indicator', 'visibility', 'visible');
			} else {
				//This typically happens so fast lets make sure it is at least visible for a second
				setTimeout(function () {
					YAHOO.util.Dom.setStyle('search_progress_indicator', 'visibility', 'hidden');
				}, 1000);
			}
		},
		/**
		 * Used to strip html tags from a given string
		 * @param {Object} str
		 */
		stripTags : function (strToClean) {
			if (YAHOO.lang.isString(strToClean)) {
				return strToClean.replace(/<\/?[a-z0-9]+>/gim, '');
			}
		},
		/**
		 * Used to create a new DOM element
		 * @param {Object} elem - Type if element to create (ex) div
		 */
		create : function (elem) {
			return document.createElementNS ?
					document.createElementNS('http://www.w3.org/1999/xhtml', elem) :
					document.createElement(elem);
		},
		/**
		 * Used to remove an element from the DOM
		 * @param {Object} elem
		 * 
		 * Note: Supports passing a string or a node reference
		 */
		remove : function (el) {
			var elToRemove = el;
			
			if (YAHOO.lang.isString(elToRemove)) {
				elToRemove = YAHOO.util.Dom.get(elToRemove) || 'undefined';
			}
			
			if (elToRemove !== 'undefined') {
				try {
					elToRemove.parentNode.removeChild(elToRemove);	
				} catch (e) {}	
			}
		}
	};
	
	/**
	 * Sideline database functionality
	 */
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
        insertGroup: "INSERT INTO search_groups(id,group_name,active) VALUES (1,'Favorites', 'Y');",
        selectAllPrefs: "SELECT * FROM user_preferences",
        insertPrefs: "INSERT INTO user_preferences(show_desktop_notifications,refresh_rate) VALUES (1,1);"
  		};
	    //begin the daisy chain of table create statments and initialization... grr...
  		sideline.doQuery(sql.createSearchGroups,[],function(tx,result){
  		  sideline.doQuery(sql.createSearches,[],function(tx,result){
          sideline.doQuery(sql.createTweets,[],function(tx,result){
            sideline.doQuery(sql.createUserPreferences,[],function(tx,result){
              sideline.doQuery(sql.selectAllPrefs,[],function(tx,result) {
                //Insert initial "Favorites" group and prefs if need be
                if (result.rows.length > 0) {
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
                }
                else {
                  sideline.doQuery(sql.insertPrefs,[],function(tx,result){
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
                }
              });
        		});
      		});
    		});
  		});
	  },
		/**
		 * Remove all non-fav tweets older than 3 hours
		 */
		dbCleanup : function () {
			var deleteSQL = "DELETE FROM tweets" + 
							" WHERE strftime('%Y-%m-%d %H:%M:%S', loaded_at) < strftime('%Y-%m-%d %H:%M:%S', datetime('now'), '-3 hours')" + 
							" AND sideline_group_id <> 1"; //Don't remove the favorites group
			this.doQuery(deleteSQL);
		},
		/**
		 * Adds new search group
		 * @param {Object} group_name
		 */
		addNewSearchGroup : function (group_name,callback) {
			var lastId,
				sqlParameters = [ group_name ],
				insertSQL     = "INSERT INTO search_groups VALUES (NULL, ?, 'Y')";
				
			this.doQuery(insertSQL, sqlParameters,function(tx,result) {
			  this.doQuery("SELECT last_insert_rowid() as id",[],function(tx,result2) {
			    callback.call(this,result2);
			  });
			});
		},
		/**
		 * Updates an existing search group
		 * @param {Object} group_name
		 */
		updateSearchGroup : function (old_group_name, new_group_name,callback) {
		  this.getGroupIdFromString(old_group_name,function(searchGrpResult) {
		    var searchGrpId = searchGrpResult.rows.item(0).id;
		    var sqlParameters = [];
		    var updateSQL = "UPDATE search_groups SET group_name = ? WHERE id = ?";
		    sqlParameters[sqlParameters.length] = new_group_name;
				sqlParameters[sqlParameters.length] = searchGrpId;
				this.doQuery(updateSQL, sqlParameters, function(tx,result) {
				  callback.call(this,searchGrpId);
				});
		  });
		},
		/**
		 * Returns all tweets for passed groups
		 * @param {Object} sideline_group_id
		 */
		getTweets : function (sideline_group_id,callback) {
			var sqlParameters = [ Number(sideline_group_id) ],
				selectSQL 	  = "SELECT id, text, from_user, twitter_id, profile_image_url, created_at, sideline_group_id, searches_id FROM tweets" +
						        " WHERE sideline_group_id = ?" +
						        " ORDER BY twitter_id DESC",
			this.doQuery(selectSQL, sqlParameters,function(tx,result) {
			  callback.call(this,result);
			});
		},
		/**
		 * Returns count of tweets/search results for passed search group
		 * @param {Object} sideline_group_id
		 */
		getTweetCountForSearchGroup : function (sideline_group_id,callback) {
			var tweetCount    = 0,
				sqlParameters = [ Number(sideline_group_id) ],
				selectSQL 	  = "SELECT count(id) AS tweet_count FROM tweets" +
						        " WHERE sideline_group_id = ?",
			this.doQuery(selectSQL, sqlParameters, function(tx,result) {
			  if (result !== null && result.rows.length === 1) {
					callback.call(this,Number(result.rows.item(0).tweet_count));
				}
			});
		},
		/**
		 * Returns search parameters for a previously created search condition
		 */
		getSearchItemParams : function(search_id,callback) {
			var sqlParameters = [ Number(search_id) ],
				selectSQL = "SELECT id, group_id, search_title, q, ands, ors, nots, phrase, tag, user_from, user_to, ref, pa, na, aq" +
			 				" FROM searches WHERE id = ?",
			this.doQuery(selectSQL, sqlParameters,function(tx,result) {
			  callback.call(this,result);
			});
		},
		/**
		 * Moves tweet into the Sideline favorites group
		 */
		markAsFavorite : function (twitterid) {
			var sqlParameters  = [ Number(twitterid) ],
				updateSQL      = "UPDATE tweets" +
								 " SET sideline_group_id = " + this.tabStore.favoritesGrpID +
								 " WHERE twitter_id = ?";
				
			this.doQuery(updateSQL, sqlParameters);
		},
		/**
		 * Retrieves user preferences
		 */
		getUserPreferences : function (callback) {
			var selectSQL = "SELECT show_desktop_notifications, refresh_rate FROM user_preferences";
			this.doQuery(selectSQL,[],function(tx,result) {
			  callback.call(this,result);
			});
		},
		/**
		 * Updates user preferences
		 */
		saveUserPreferences : function () {
			var sqlParameters = [],
				updateSQL     = "UPDATE user_preferences" +
								 " SET show_desktop_notifications = ? ," +
								 " refresh_rate = ?";
								 
			sqlParameters[sqlParameters.length] = Number(this.showDesktopNotifications);
			sqlParameters[sqlParameters.length] = Number(this.searchRefreshRate);
				
			this.doQuery(updateSQL, sqlParameters);
		},
		/**
		 * Used to add new tweet to the database.  Used in data rotations.
		 * @param {Object} text
		 * @param {Object} to_user_id
		 * @param {Object} from_user
		 * @param {Object} twitter_id
		 * @param {Object} from_user_id
		 * @param {Object} profile_image_url
		 * @param {Object} created_at
		 * @param {Object} group_id
		 * @param {Object} searches_id
		 */
		addTweet : function (text, to_user_id, from_user, twitter_id, from_user_id, profile_image_url, created_at, group_id, searches_id, callback) {
			var sqlParameters = [],
				insertSQL     = "INSERT INTO tweets (text, to_user_id, from_user, twitter_id, from_user_id, profile_image_url, created_at, sideline_group_id, searches_id)" +
		    					" VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
								
				sqlParameters[sqlParameters.length] = text;
				sqlParameters[sqlParameters.length] = Number(to_user_id);
				sqlParameters[sqlParameters.length] = from_user;
				sqlParameters[sqlParameters.length] = Number(twitter_id);
				sqlParameters[sqlParameters.length] = Number(from_user_id);
				sqlParameters[sqlParameters.length] = profile_image_url;
				sqlParameters[sqlParameters.length] = created_at;
				sqlParameters[sqlParameters.length] = Number(group_id);
				sqlParameters[sqlParameters.length] = Number(searches_id);
		
			this.doQuery(insertSQL, sqlParameters,function(tx,result) {
			  this.doQuery("SELECT last_insert_rowid() as id",[],function(tx,result) {
			    callback.call(this,result);
			  });
			});
		},
		/**
		 * Removes a single tweet record from the database
		 * @param {Object} twitter_id
		 */
		removeTweet : function (twitter_id) {
			var sqlParameters = [ Number(twitter_id) ],
				deleteSQL     = "DELETE FROM tweets WHERE twitter_id = ?";
			
			this.doQuery(deleteSQL, sqlParameters);
		},
		/**
		 * Removes all related tab data (i.e.) the search queries, results, and group
		 * @param {Object} group_id
		 */
		removeTabData: function(group_id) {
			var sqlParameters = [Number(group_id)], 
				deleteSearchQueriesSQL = "DELETE FROM searches WHERE group_id = ?",
				deleteSearchResultsSQL = "DELETE FROM tweets WHERE sideline_group_id = ?",
				deleteSearchGroupSQL   = "DELETE FROM search_groups WHERE id = ?";
	    this.doQuery(deleteSearchQueriesSQL, sqlParameters);
			this.doQuery(deleteSearchResultsSQL, sqlParameters);
			this.doQuery(deleteSearchGroupSQL, sqlParameters);
		},
		/**
		 * Returns group_id of the passed group string
		 * @param {Object} group_string
		 */
		getGroupIdFromString : function (group_string,callback) {
		  var sqlParameters = [ group_string ],
				selectSQL     = "SELECT id FROM search_groups WHERE group_name = ?",
			this.doQuery(selectSQL, sqlParameters, function(tx,result) {
			  callback.call(this,result);
			});	
		},
		/**
		 * Returns all search strings defined for passed group
		 * @param {Object} sideline_group_id
		 */
		getSidelineGroupQueries : function (sideline_group_id,callback) {
			var sqlParameters        = [ Number(sideline_group_id) ],
				selectSQL            = "SELECT id, group_id, search_title, actual_query_string, q, ands, ors, nots, phrase, tag, user_from, user_to, ref, twitter_starting_point" +
										" FROM searches WHERE active='Y' AND group_id = ?",
			this.doQuery(selectSQL, sqlParameters, function(tx,result) {
			  callback.call(this,result);
			});
		},
		/**
		 * Returns the total number of active searches
		 */
		getCountOfActiveQueries : function (callback) {
			var selectSQL = "SELECT count(id) as total_search_count" +
										    " FROM searches WHERE active='Y'",
				activeSearchCount        = 0;
				
			this.doQuery(selectSQL,[],function(tx,result) {
			  if (result !== null && result.rows.length === 1) {
					callback.call(this,Number(result.rows.item(0).total_search_count))
				}
			});
		},
		/**
		 * Returns the max twitter id for given search term.  Used as starting point when querying the Twitter Search API.
		 * @param {Object} searches_id
		 */
		getMaxTwitterIdForSearchTerm : function (searches_id,callback) {
			var sqlParameters = [ Number(searches_id) ],
				selectSQL     = "SELECT MAX(twitter_id) as twitter_id FROM tweets WHERE searches_id = ?";
			this.doQuery(selectSQL, sqlParameters, function(tx,result) {
  			callback.call(this,result);
  		});
		},
		/**
		 * Updates the max twitter id for given search term.  Used as starting point when querying the Twitter Search API.
		 * @param {Object} searches_id
		 */
		updateMaxTwitterIdForSearchTerm : function (twitter_id, searches_id) {
			var sqlParameters = [];
			var selectSQL = "UPDATE searches SET twitter_starting_point = ? WHERE id = ?";
			
			sqlParameters[sqlParameters.length] = Number(twitter_id);	
			sqlParameters[sqlParameters.length] = Number(searches_id);
			
			this.doQuery(selectSQL, sqlParameters);
		},
		/**
		 * Get all active search groups
		 */
		getAllSidelineGroups : function (callback) {
			var selectSQL = "SELECT id, group_name FROM search_groups WHERE active='Y' ORDER BY id ASC",
			sidelineGroups = this.doQuery(selectSQL,[],function(tx,result) {
			  callback.call(this,result);
			});
		},
		/**
		 * Remove search query string from active group
		 * @param {Object} id
		 */
		removeSearchItem : function (id) {
			var sqlParameters = [ Number(id) ],
				deleteSQL     = "DELETE FROM searches WHERE id = ?";
		
			this.doQuery(deleteSQL, sqlParameters);
		},
		/**
		 * Add search query string to active group
		 * @param {Object} searchItemObject (example below)
		 * {
		 * 	group_id: group_id,
		 * 	search_title: search_title,
		 *  actual_query_string: actual_query_string,
		 *  q: q,
		 *  ands: ands,
		 *  ors: ors,
		 *  nots: nots,
		 *  phrase: phrase,
		 *  tag: tag,
		 *  user_from: user_from,
		 *  user_to: user_to,
		 *  ref: ref,
		 *  pa: pa,
		 *  na: na,
		 *  aq: aq
		 * }
		 */
		addSearchItem : function (searchItemObject, callback) {
			var lastId,
				sqlParameters = [],
				insertSQL = "INSERT INTO searches (id, group_id, search_title, actual_query_string, q, ands, ors, nots, phrase, tag, user_from, user_to, ref, pa, na, aq, twitter_starting_point, active)" + 
							" VALUES (null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'Y')";
			
			sqlParameters[sqlParameters.length]  = Number(searchItemObject.group_id);
			sqlParameters[sqlParameters.length]  = searchItemObject.search_title;
			sqlParameters[sqlParameters.length]  = searchItemObject.actual_query_string;
			sqlParameters[sqlParameters.length]  = searchItemObject.q;
			sqlParameters[sqlParameters.length]  = searchItemObject.ands;
			sqlParameters[sqlParameters.length]  = searchItemObject.ors;
			sqlParameters[sqlParameters.length]  = searchItemObject.nots;
			sqlParameters[sqlParameters.length]  = searchItemObject.phrase;
			sqlParameters[sqlParameters.length]  = searchItemObject.tag;
			sqlParameters[sqlParameters.length]  = searchItemObject.user_from;
			sqlParameters[sqlParameters.length]  = searchItemObject.user_to;
			sqlParameters[sqlParameters.length]  = searchItemObject.ref;
			sqlParameters[sqlParameters.length]  = searchItemObject.pa;
			sqlParameters[sqlParameters.length]  = searchItemObject.na;
			sqlParameters[sqlParameters.length]  = searchItemObject.aq;
				
			this.doQuery(insertSQL, sqlParameters, function(tx,result) {
			  this.doQuery("SELECT last_insert_rowid() as id",[],function(tx,result) {
			    callback.call(this,result);
			  });
			});
		},
		/**
		 * Add search query string to active group
		 * @param {Object} searchItemObject (example below)
		 * {
		 * 	group_id: group_id,
		 * 	search_title: search_title,
		 *  actual_query_string: actual_query_string,
		 *  q: q,
		 *  ands: ands,
		 *  ors: ors,
		 *  nots: nots,
		 *  phrase: phrase,
		 *  tag: tag,
		 *  user_from: user_from,
		 *  user_to: user_to,
		 *  ref: ref,
		 *  pa: pa,
		 *  na: na,
		 *  aq: aq
		 * }
		 * 
		 * Note: When an item is updated we reset the Twitter starting point
		 */
		updateSearchItem : function (searchId, searchItemObject, callback) {
			var sqlParameters = [],
				updateSQL = "UPDATE searches set " +
							"search_title = ?, actual_query_string = ?, q = ?, ands = ?, ors = ?, nots = ?, phrase = ?, " +
							"tag = ?, user_from = ?, user_to = ?, ref = ?, pa = ?, na = ?, aq = ?, twitter_starting_point = 0" +
							" WHERE id = ?";
			
			sqlParameters[sqlParameters.length]  = searchItemObject.search_title;
			sqlParameters[sqlParameters.length]  = searchItemObject.actual_query_string;
			sqlParameters[sqlParameters.length]  = searchItemObject.q;
			sqlParameters[sqlParameters.length]  = searchItemObject.ands;
			sqlParameters[sqlParameters.length]  = searchItemObject.ors;
			sqlParameters[sqlParameters.length]  = searchItemObject.nots;
			sqlParameters[sqlParameters.length]  = searchItemObject.phrase;
			sqlParameters[sqlParameters.length]  = searchItemObject.tag;
			sqlParameters[sqlParameters.length]  = searchItemObject.user_from;
			sqlParameters[sqlParameters.length]  = searchItemObject.user_to;
			sqlParameters[sqlParameters.length]  = searchItemObject.ref;
			sqlParameters[sqlParameters.length]  = searchItemObject.pa;
			sqlParameters[sqlParameters.length]  = searchItemObject.na;
			sqlParameters[sqlParameters.length]  = searchItemObject.aq;
			sqlParameters[sqlParameters.length]  = searchId;
				
			this.doQuery(updateSQL, sqlParameters, function(tx,result) {
			  callback.call(this,result);
			});
		}
	};
	
	/**
	 * This widget is designed to be a dropin replacement for alert()
	 * Code snippet from: http://blog.davglass.com/files/yui/widget_alert/widget.alert.js
	 * Note: Slightly modified for this application
	 */
	(function () {
	  YAHOO.namespace('widget.alert');
	
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
	
	  YAHOO.util.Event.on(window, 'load', function () {
	    var handleOK = function () {
	      this.hide();
	    };
	
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
	      buttons: [
	        { text: 'OK', handler: handleOK }
	      ]
	    });
	    YAHOO.widget.alert.dlg.setHeader("Alert!");
	    YAHOO.widget.alert.dlg.setBody('Alert body passed to window.alert'); // Bug in panel, must have a body when rendered
	    YAHOO.widget.alert.dlg.render(document.body);
	  });
	})();
	
  /*************************
	 * Run the init processes
	 *************************/
	
	(function() {
		
		var sideline = new YAHOO.TI.Sideline();
		YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineDB);   //Add database functionality
		YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineUtil); //Add utility support as well	
		
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
		    sideline.setupRefreshRateSlider();
		    sideline.setupSearchRateDialog();
		    sideline.setupTooltip();
		    sideline.setupTabs();
		    
		    //Initialize menu items
		    sideline.setupMenu();
    		
    		/**
    		 * Perform database cleanup on startup and schedule for every 3ish hours thereafter
    		 * Note: Tweets are cleared from the database, but not the DOM.  Will not be redrawn on next app startup. 
    		 */
    		sideline.dbCleanup();
    		setInterval(function () {
    			sideline.dbCleanup();
    		}, 10860000);    		     

    		//Run Trend fetcher on startup and schedule for every 5 mins thereafter (while the application is open that is)
    		sideline.getTwitterTrends();
    		setInterval(function () {
    			sideline.getTwitterTrends();
    		}, 300000);

    		//Run Tweet fetcher on startup and schedule for future runs thereafter (while the application is open that is)
    		sideline.dataRotation();
    		sideline.rotationTimer = setInterval(function () {
    			sideline.dataRotation();
    		}, sideline.searchRefreshRate * 60000);
    		
    		//Create necessary event handlers
    		YAHOO.util.Event.on('twitter_trend_list', 'click', sideline.handleTrendEvents, sideline, true);
    	});
		});
		
	})();
});