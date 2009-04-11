/**
 * Copyright (c) 2008-2009 Yahoo! Inc.  All rights reserved.  
 * The copyrights embodied in the content of this file are licensed by Yahoo! Inc. under 
 * the BSD (revised) open source license.
 */

YAHOO.util.Event.onDOMReady(function () {

	YAHOO.namespace("AIR");
	
	YAHOO.AIR.Sideline = function () {
		var rotationTimer,
			rotationJobCount = 0,
			rotationTotal    = 0;
	};
	YAHOO.AIR.Sideline.prototype = {
		tabView: null,
		tabStore: [],
		showDesktopNotifications: null,
		searchRefreshRate: null,
		desktopNotificationLoader: null,
		/**
		 * Used to assemble a simple dialog for building advanced Twitter search queries
		 */
		searchDialogBuilder : function () {
			var that = this;
	
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				var queryString,
					data   = this.getData(),
					title  = that.stripTags(YAHOO.lang.trim(data.title_of_search)), //title doesn't get the "+"
					q      = that.processSearchDialogData(data.q),
					ands   = that.processSearchDialogData(data.ands),
					phrase = that.processSearchDialogData(data.phrase),
					ors    = that.processSearchDialogData(data.ors),
					nots   = that.processSearchDialogData(data.nots),
					tag    = that.processSearchDialogData(data.tag),
					from   = that.processSearchDialogData(data.from),
					to     = that.processSearchDialogData(data.to),
					ref    = that.processSearchDialogData(data.ref),
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
						grpId = that.getCurrentGrpId(),
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
						var newQueryStringId = that.addSearchItem(searchItemDetails);
						
						if (newQueryStringId.data !== null) {
							//Inject new list item into the DOM
							var newLi = that.create("li");
							newLi.id = 'search__' + newQueryStringId.data[0].id;
							YAHOO.util.Dom.addClass(newLi, 'search_string_item');
							newLi.innerHTML = title;
							var countOfSearchItems = YAHOO.util.Dom.getElementsByClassName('search_string_item', 'li', 'active_search_strings').length;
							var lastActiveSearchItem = YAHOO.util.Dom.getLastChild('active_search_strings');
							YAHOO.util.Dom.insertAfter(newLi, lastActiveSearchItem);
							
							//If this was the first real search item then remove the stub
							if (countOfSearchItems === 'undefined' || countOfSearchItems === 0) {
								var firstChild = YAHOO.util.Dom.getFirstChild('active_search_strings');
								that.remove(firstChild);
							}
							
							this.hide(); //Hide the search dialog after sucessful save
							YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
						}
						else {
							alert('Unable to add new search string!  Please try again.');
						}
					} else {
						that.updateSearchItem(searchId, searchItemDetails);
						YAHOO.util.Dom.get('search__' + searchId).innerHTML = title; //Since the title may have changed
						this.hide(); //Hide the search dialog after sucessful save
						
						//The search has changed, cleanup old results
						that.removeSearchTermTweets(grpId, searchId);
						//If that removed everything from the group put the empty block back
						var currentSummaryGrp = YAHOO.util.Dom.get("summary-group-" + grpId);
						if (!currentSummaryGrp.hasChildNodes()) {
							currentSummaryGrp.innerHTML = '<p id="emptygroup__' + grpId + '">This group has no search results yet!</p>';
						}
						
						YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
					}
					
					that.doIntermediateDataRotation.call(that); //Run a rotation immediately
				}
				
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
				this.cancel();
			};
			
			var handleDelete = function () {
				var currentSearchId    = YAHOO.util.Dom.get('search_to_update').value,
					countOfSearchItems = YAHOO.util.Dom.getElementsByClassName('search_string_item', 'li', 'active_search_strings').length;
				
				if (currentSearchId !== '') {
					//Do the delete/fade of the search term and remove the related search results....
					that.removeSearchItem(currentSearchId);
					that.fadeThisOut(YAHOO.util.Dom.get('search__' + currentSearchId), true);
					that.removeSearchTermTweets(that.getCurrentGrpId(), currentSearchId);
					
					//If this was the last search item in the list then readd the stub
					if (countOfSearchItems === 'undefined' || countOfSearchItems <= 1) {
						var searchStringList       = YAHOO.util.Dom.get("active_search_strings");
						searchStringList.innerHTML = '<li class="list_message">This group has no searches defined!</li>';
					}
					
					YAHOO.util.Dom.get('add_search_form').reset(); //Prepare for future use
					this.cancel();
				}
			};
		
			//Instantiate the Dialog
			this.searchDialog = new YAHOO.widget.Dialog("add_search_dialog", 
									{ width : "435px",
									  fixedcenter : true,
									  visible : false,
									  modal: true,
									  draggable: false,
									  underlay: "none",
									  postmethod: "none",
									  constraintoviewport : true,
									  buttons : [ { text: "Delete", handler: handleDelete },
									  			{ text: "Submit", handler: handleSubmit },
										      	{ text: "Cancel", handler: handleCancel }]
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
			var that = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				var formData = this.getData(),
					search_group_title = that.stripTags(YAHOO.lang.trim(formData.search_group_title));
				if (search_group_title === '') {
					alert('You must provide a title for this search group!');
					return false;
				} else {
					var tabLabel,
						newGroupId = that.addNewSearchGroup(search_group_title);
					if (newGroupId.data !== null) {
						//Remove
						
						//New group was created so add the new tab, make it active, and replace the add tab button
						that.remove(YAHOO.util.Dom.get("add_new_group"));
						tabLabel = that.buildTabText(search_group_title);
						that.tabView.addTab(new YAHOO.widget.Tab({ 
														label: tabLabel,
														active: true,
														content: '<div id="summary-group-' + newGroupId.data[0].id + '" class="tweet-container summary-group-' + newGroupId.data[0].id + '">' +
																	'<p id="emptygroup__' + newGroupId.data[0].id + '">This group has no search results yet!</p><div>'
													})
												);
						
						that.setupNewTabButton();
						that.refreshTabStore();  //Refresh tabStore to pickup new tab
						
						var searchStringList       = YAHOO.util.Dom.get("active_search_strings");
						searchStringList.innerHTML = '<li class="list_message">This group has no searches defined!</li>';
						
						this.hide(); //Hide the search group dialog after sucessful save
						YAHOO.util.Dom.get('add_search_group_form').reset(); //Prepare for future use
						YAHOO.util.Dom.setStyle('add_new_search', 'visibility', 'visible'); //Set to display on tab change, but if first tab this would be missing
					} else {
						alert('Unable to add new Search Group!  Please try again.');
					}
				}
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('add_search_group_form').reset(); //Prepare for future use
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.searchGrpDialog = new YAHOO.widget.Dialog("add_search_group_dialog", 
									{ width : "250px",
									  fixedcenter : true,
									  visible : false,
									  modal: true,
									  draggable: false,
									  underlay: "none",
									  postmethod: "none",
									  constraintoviewport : true,
									  buttons : [ { text: "Submit", handler: handleSubmit },
										      { text: "Cancel", handler: handleCancel } ]
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
		 * Used to assemble a dialog for adjusting the API query rate
		 */
		searchRateDialogBuilder : function () {
			var that = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Save the new rate and fire a rotation (this also resets the timers with the new refresh rate)
				that.searchRefreshRate = Number(YAHOO.lang.trim(YAHOO.util.Dom.get("slider-converted-value").innerHTML));
				that.saveUserPreferences();
				that.doIntermediateDataRotation.call(that);
				this.cancel(); //close the dialog
			};
			
			var handleCancel = function () {
				//Restore current setting from stored prefs in cause they changed, but did not save
				YAHOO.AIR.Sideline.slider.setValue((that.searchRefreshRate / 6) * 20, false);
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.searchRateDialog = new YAHOO.widget.Dialog("search_rate_dialog", 
									{ width : "250px",
									  fixedcenter : true,
									  visible : false,
									  modal: true,
									  draggable: false,
									  underlay: "none",
									  postmethod: "none",
									  constraintoviewport : true,
									  buttons : [ { text: "Submit", handler: handleSubmit },
										      { text: "Cancel", handler: handleCancel } ]
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
		/**
		 * Used to assemble a simple dialog for renaming an existing search group
		 */
		renameSearchGrpDialogBuilder : function () {
			var that = this;
			
			//Define various event handlers for Dialog
			var handleSubmit = function () {
				//Gather up the form inputs
				var formData = this.getData(),
					new_search_group_title = that.stripTags(YAHOO.lang.trim(formData.new_search_group_title)),
					old_search_group_title = that.stripTags(YAHOO.lang.trim(formData.old_search_group_title));
				
				if (new_search_group_title === '' || (new_search_group_title === old_search_group_title)) {
					alert('You must provide a new title for this search group!');
					return false;
				} else {
					//Update group name in the database, the tabStore, and on the tab itself
					var newTabLabel          = that.buildTabText(new_search_group_title),
						updatedSearchGroupId = that.updateSearchGroup(old_search_group_title, new_search_group_title);
					
					that.tabStore[updatedSearchGroupId].label = newTabLabel;
					that.tabStore[updatedSearchGroupId].nodeReference.innerHTML = newTabLabel;
					that.refreshTabStore();  //Refresh tabStore to pickup tab changes
					this.hide(); //Hide the search group dialog after sucessful save
					YAHOO.util.Dom.get('rename_search_group_form').reset(); //Prepare form for future use
				}
			};
			
			var handleCancel = function () {
				YAHOO.util.Dom.get('rename_search_group_form').reset(); //Prepare form for future use
				this.cancel();
			};
		
			//Instantiate the Dialog
			this.renameSearchGrpDialog = new YAHOO.widget.Dialog("rename_search_group_dialog", 
									{ width : "250px",
									  fixedcenter : true,
									  visible : false,
									  modal: true,
									  draggable: false,
									  underlay: "none",
									  postmethod: "none",
									  constraintoviewport : true,
									  buttons : [ { text: "Submit", handler: handleSubmit },
										      { text: "Cancel", handler: handleCancel } ]
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
		 * Used to assemble a simple dialog for search item delete confirmation
		 * @param {Object} search_id
		 * @param {Object} elTargetNode - (node to fade out)
		 */
		searchItemRemovalDialog : function (search_id, elTargetNode) {
			var  that = this;
			
			//Define various event handlers for this simpledialog
			var handleYes = function () {
				//Do the delete/fade....
				that.removeSearchItem(search_id);
				that.fadeThisOut(elTargetNode, true);
				this.hide();
			};
			var handleNo = function () {
				this.hide();
			};
		
			//Instantiate the Dialog
			this.searchItemRemoval = new YAHOO.widget.SimpleDialog("searchItemRemoval", 
										 { width: "300px",
										   fixedcenter: true,
										   visible: false,
										   draggable: false,
										   underlay: "none",
										   modal: true,
										   close: true,
										   text: "Are you sure you want to remove this search item?",
										   icon: YAHOO.widget.SimpleDialog.ICON_WARN,
										   constraintoviewport: true,
										   buttons: [ { text: "Yes", handler: handleYes },
													  { text: "No",  handler: handleNo } ]
										 });
			this.searchItemRemoval.setHeader("Confirmation Dialog");
			this.searchItemRemoval.render("search_item_simpledialog");
		},
		/**
		 * Used to assemble a simple dialog for search group delete confirmation
		 */
		searchGrpRemovalDialog : function () {
			var that = this;
			
			//Define various event handlers for this simpledialog
			var handleYes = function () {
				//Do the delete....
				var activeTab = YAHOO.util.Selector.query('li.selected a em'),
				tabText   = activeTab[0].innerHTML;
			
				if (tabText !== 'Favorites') {
					var grpId        = that.getCurrentGrpId(),
						tabId        = 'summary-group-' + grpId,
						tabContainer = YAHOO.util.Dom.get(tabId);
					if (grpId !== 'undefined') {
						//Remove tab data (i.e.) the search queries, results, and group
						that.removeTabData(grpId);
						
						//Remove event listeners and references to this tab and then physically remove it
						YAHOO.util.Event.purgeElement(tabContainer, true);
						that.tabStore[grpId].nodeReference = null;
						that.tabView.removeTab(that.tabView.get('activeTab'));
					}
				} else {
					alert('The favorites group cannot be removed!');
				}
				
				this.hide();
				that.refreshTabStore();
			};
			var handleNo = function () {
				this.hide();
			};
		
			//Instantiate the Dialog
			this.searchGrpRemoval = new YAHOO.widget.SimpleDialog("searchGrpRemoval", 
										 { width: "300px",
										   fixedcenter: true,
										   visible: false,
										   draggable: false,
										   underlay: "none",
										   modal: true,
										   close: true,
										   text: "Are you sure you want to remove this search group?",
										   icon: YAHOO.widget.SimpleDialog.ICON_WARN,
										   constraintoviewport: true,
										   buttons: [ { text: "Yes", handler: handleYes },
													  { text: "No",  handler: handleNo } ]
										 });
			this.searchGrpRemoval.setHeader("Confirmation Dialog");
			this.searchGrpRemoval.render("search_item_simpledialog");
		},
		/**
		 * Used to handle tab construction during initial app load
		 */
		setupSidelineTabs : function () {
			var that = this,
				sidelineGroups = this.getAllSidelineGroups(); //We'll always have at least 2 grps (ie) Favorites & Trends
			
			//The trends group is not in the database so it is added seperately here
			this.tabView.addTab(new YAHOO.widget.Tab({ 
													label: this.buildTabText("Trends"),
													active: false,
													content: '<div id="trending_content" class="tweet-container">' +
																'<p>Popular topics right now</p>' +
																'<div id="twitter_trend_list"><p>Loading trends...<img src="images/search_in_progress.gif" alt="loading" /></p></div>' +
																'<p id="twitter_trend_asof"></p>' +
															'</div>'
												})
											);
		
			//We need to open a tab for each group
			for (var i = 0; i < sidelineGroups.data.length; i++) {				
				//Collect tweets for this group and build tweet rows for this tab if we have data
				var tweetStr       = '',
					tweetStrParts  = [],
					tabLabel	   = '',
					grpTweets      = this.getTweets(sidelineGroups.data[i].id);				
				
				tweetStrParts[tweetStrParts.length] = '<div id="summary-group-' + sidelineGroups.data[i].id + '" class="tweet-container summary-group-' + sidelineGroups.data[i].id + '">';
				if (grpTweets.data !== null) {
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
				} else {
					tweetStrParts[tweetStrParts.length] = '<p id="emptygroup__' + sidelineGroups.data[i].id + '">This group has no search results yet!</p>';
				}
				
				//Close it up
				tweetStrParts[tweetStrParts.length] = '</div>';
				//Pull it all back together
				tweetStr = tweetStrParts.join("");
				
				//Add a new tab per group
				tabLabel = this.buildTabText(sidelineGroups.data[i].group_name);
			  this.tabView.addTab(new YAHOO.widget.Tab({
			    label: tabLabel,
			    content: tweetStr,
			    active: false
			  }));
				
				this.tabView.appendTo('tweetainer'); //Inject new tab
			}
			
			this.refreshTabStore();
			this.setupNewTabButton();
			
			//Update active search list with ones for the newly selected tab
			this.tabView.addListener('activeTabChange', function (e) {
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

			});
			
			this.tabView.set('activeIndex', 0);  //Make tab at index 0 active (ie) Trends
		},
		/**
		 * Used to put an add tab button on beside the last tab.  Reset when new tabs are added.
		 * 
		 * Note: Image nodes shouldn't really be placed within unordered lists like this.  It renders fine,
		 * but isn't standards compliant and we should have a better option.
		 */
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
		/**
		 * Data rotation are fired at set intervals.  Some actions, like adding a new tab or hitting refresh,
         * require us to stop rotation, fire one immediately, and then reconstruct the scheduled intervals.
		 */
		doIntermediateDataRotation : function() {
			var that = this;
			clearInterval(this.rotationTimer);
			
			//Make sure we don't double up on notifications
			if (!YAHOO.lang.isNull(this.desktopNotificationLoader)) {
				this.desktopNotificationLoader.stage.nativeWindow.close();
			}
			
			this.dataRotation();
			this.rotationTimer = setInterval(function () {
									that.doIntermediateDataRotation.call(that);
								}, that.searchRefreshRate * 60000);
		},
		/**
		 * Handles onclick actions for the active search list.  Used in add and remove operations.
		 * @param {Object} e
		 */
		activeSearchHandler : function (e) {
			var eltarget = YAHOO.util.Event.getTarget(e);
			
			if (YAHOO.util.Dom.hasClass(eltarget, 'search_string_item')) {
				//This is an edit or removal request
				var eltargetIdSplit = eltarget.id.split("__"), //(ex) search__12
					search_id       = eltargetIdSplit[1];
				
				//Construct dialog for this search item to allow editing and/or confirm deletion....
				this.restoreSearchItemDialog(search_id);
				this.searchDialog.show();
			} else if (eltarget.id === 'add_new_search') {
				var grpId = this.getCurrentGrpId();
				
				if (grpId !== 'undefined') {
					if (grpId === this.tabStore.favoritesGrpID || grpId === this.tabStore.trendsGrpID) {
						alert('You cannot define search conditions for this group!');
					} else {
						//Disable the delete button on new additions
						var deleteButton = YAHOO.util.Dom.get("yui-gen0");
						YAHOO.util.Dom.addClass(deleteButton, 'yui-button-disabled');
						YAHOO.util.Dom.get('search_to_update').value = ""; //Clear any old edits
						
						//Default to the simple search form
						YAHOO.util.Dom.setStyle("advanced_search", "display", "none");
						YAHOO.util.Dom.setStyle("simple_search", "display", "");
						this.searchDialog.show();
					}
				}
			}
		},
		/**
		 * Used to restore a search condition for modification/deletion
		 * @param {Object} search_id
		 */
		restoreSearchItemDialog : function (search_id) {
			function reversePlus(str) {
				var returnStr;
				if (YAHOO.lang.isString(str)) {
					returnStr = str.replace(/\+/g, " ");
				} else {
					returnStr = '';
				}
				
				return returnStr;
			}
			
			//Fetch existing search parameters
			var searchItemParams = this.getSearchItemParams(search_id);
			
			if (YAHOO.lang.isObject(searchItemParams.data) && searchItemParams.data[0].id !== 'undefined') {
				//Restore form data
				var searchItem = searchItemParams.data[0],
					searchTitle = searchItem.search_title,
					q           = reversePlus(searchItem.q),
					ands        = reversePlus(searchItem.ands),
					ors         = reversePlus(searchItem.ors),
					nots        = reversePlus(searchItem.nots),
					phrase      = reversePlus(searchItem.phrase),
					tag         = reversePlus(searchItem.tag),
					user_from   = reversePlus(searchItem.user_from),
					user_to     = reversePlus(searchItem.user_to),
					ref         = reversePlus(searchItem.ref),
					pa			= searchItem.pa,
					na			= searchItem.na,
					aq			= searchItem.aq;
					
				YAHOO.util.Dom.get('title_of_search').value = searchTitle;
				YAHOO.util.Dom.get('q').value = q;
				YAHOO.util.Dom.get('ands').value = ands;
				YAHOO.util.Dom.get('ors').value = ors;
				YAHOO.util.Dom.get('nots').value = nots;
				YAHOO.util.Dom.get('phrase').value = phrase;
				YAHOO.util.Dom.get('tag').value = tag;
				YAHOO.util.Dom.get('from').value = user_from;
				YAHOO.util.Dom.get('to').value = user_to;
				YAHOO.util.Dom.get('ref').value = ref;
				YAHOO.util.Dom.get('search_to_update').value = search_id; //So we know what search to act on during save/delete
				
				//Deal with checkboxes
				if (pa === 'true') {
					YAHOO.util.Dom.get('pa').checked = true;	
				}
				if (na === 'true') {
					YAHOO.util.Dom.get('na').checked = true;	
				}
				if (aq === 'true') {
					YAHOO.util.Dom.get('aq').checked = true;	
				}
				
				//Determine if we need to present the simple or advanced search form
				//Note: simple is the default
				if (q === '') {
					YAHOO.util.Dom.setStyle("simple_search", "display", "none");
					YAHOO.util.Dom.setStyle("advanced_search", "display", "");
				} else {
					YAHOO.util.Dom.setStyle("advanced_search", "display", "none");
					YAHOO.util.Dom.setStyle("simple_search", "display", "");
				}
				
				//This is an existing entry so removal is an option
				var deleteButton = YAHOO.util.Dom.get("yui-gen0");
				YAHOO.util.Dom.removeClass(deleteButton, 'yui-button-disabled');
			}
			
		},
		/**
		 * Used to add a tweet row to an existing tab
		 * @param {Object} tweet
		 * var tweet = {
		 * 				local_tweet_id: '',
		 *				tweet_text: '',
		 *				to_user_id: ,
		 *				from_user: ,
		 *				twitter_id: ,
		 *				from_user_id: ,
		 *				profile_image_url: '',
		 *				created_at: '',
		 *				group_id: , 
		 *				searches_id:
		 *				};
		 */
		addToTab : function (tweet) {
			var tDate         = new Date(tweet.created_at),
				tDateLocal    = tDate.toLocaleString(),
				tweetStr      = '',
				tweetStrParts = [];
				
			tweetStrParts[tweetStrParts.length] = '<div class="tweet-container-left">';
			tweetStrParts[tweetStrParts.length] = 	'<img height="48" width="48" class="profile_image" src="' + tweet.profile_image_url + '" alt="' + tweet.from_user + '" />';
			tweetStrParts[tweetStrParts.length] = '</div>';
			tweetStrParts[tweetStrParts.length] = '<div id="tweet-gid' + tweet.group_id + '-tid' + tweet.twitter_id + '" class="tweet-container-center">';
			tweetStrParts[tweetStrParts.length] = 	'<p class="tweet_text" id="db_' + tweet.twitter_id + '">';
			tweetStrParts[tweetStrParts.length] = 		'<a style="text-decoration: underline;" class="tweet_link" href="http://twitter.com/' + tweet.from_user + '">' + tweet.from_user + '</a>&nbsp;';
			tweetStrParts[tweetStrParts.length] = 		tweet.tweet_text;
			tweetStrParts[tweetStrParts.length] = 	'</p>';
			tweetStrParts[tweetStrParts.length] = 	'<p class="tweet-date">' + tDateLocal + '</p>';
			tweetStrParts[tweetStrParts.length] = '</div>';
			tweetStrParts[tweetStrParts.length] = '<div class="tweet-container-right">';
			tweetStrParts[tweetStrParts.length] =		'<span title="Favorite this Tweet" class="fav_reply_remove fav_button" id="fav__' + tweet.twitter_id + '__' + tweet.from_user + '"></span>';
			tweetStrParts[tweetStrParts.length] = 		'<span title="Reply to Tweet" class="fav_reply_remove reply_button reply_button" id="reply__' + tweet.twitter_id + '__' + tweet.from_user + '"></span>';
			tweetStrParts[tweetStrParts.length] = '</div>';
			tweetStrParts[tweetStrParts.length] = '<br class="clear" />'; //break inside node so it fades with node
			
			//Pull it all back together
			tweetStr = tweetStrParts.join("");
	
			var newTweetDivContainer = this.create("div");
			newTweetDivContainer.id  = 'tweet__' + tweet.local_tweet_id + '__' + tweet.twitter_id;
			newTweetDivContainer.className = 'single-tweet detail-group-' + tweet.group_id + ' search-term-' + tweet.searches_id;
			newTweetDivContainer.innerHTML = tweetStr;
			
			//Now to append to the beginning of the matching group tab
			var firstTweetInGroup = this.findFirstTweet(tweet.group_id) || 'undefined';	
			YAHOO.util.Dom.insertBefore(newTweetDivContainer, firstTweetInGroup);
			var newlyAddedNode = YAHOO.util.Dom.get(newTweetDivContainer.id);
			this.fadeThisIn(newlyAddedNode);
			
			//Remove leftover placeholder if exits
			var emptyBlock = YAHOO.util.Dom.get('emptygroup__' + tweet.group_id) || 'undefined';
			if (emptyBlock !== 'undefined') {
				this.remove(emptyBlock);	
			}
		},
		/**
		 * Used to remove tweets from tab and db when the original search term is deleted or changed
		 * @param {Object} searches_id
		 */
		removeSearchTermTweets : function (group_id, searches_id) {
			//Remove from the database
			var deleteSQL = "DELETE FROM tweets" + 
							" WHERE searches_id = " + Number(searches_id);
			this.doQuery(deleteSQL);
			
			//Identify effected tweets
			var i,
				searchTermClass = "search-term-" + searches_id,
				summaryGroupId  = "summary-group-" + group_id,
				tweets          = YAHOO.util.Dom.getElementsByClassName(searchTermClass, "div", summaryGroupId),
				tweetLength     = tweets.length; //so we iterate over the live collection
			
			//Remove from DOM
			for(i = 0; i < tweetLength; i++) {
				this.remove(tweets[i]);
			}
			
			//Update search group tab store count and visual counter
			this.tabStore[group_id].totalTweetCount = this.tabStore[group_id].totalTweetCount -  tweetLength;
			YAHOO.util.Dom.get("search_group_result_count").innerHTML = 'Search Group Total: ' + this.tabStore[group_id].totalTweetCount;
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
		/**
		 * Build/refresh data store that maintains important information about search groups/tabs
		 * Note: Called on app launch and after a new search group/tab has been added
		 */
		refreshTabStore : function() {
			//Find all the tabs and setup reference data store
			var that = this,
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
					selectedTabText = that.getRawTabText(eltarget.innerHTML);
					
				if (selectedTabText !== 'Trends' && selectedTabText !== 'Favorites') {
					YAHOO.util.Dom.get("new_search_group_title").value = selectedTabText;
					YAHOO.util.Dom.get("old_search_group_title").value = selectedTabText;
					that.renameSearchGrpDialog.show();
				}
			});
		},
		/**
		 * Used to adjust active search list on tab change
		 * @param {Object} search_strings
		 * 
		 * Example:
		 * search_strings 
		 * {
		 * 	data {
		 * 	 id =, group_id=, search_title=''
		 * 	}
		 * }
		 */
		updateActiveSearchList : function (search_strings) {
			var i, 
				tmpString = '',
				searchStringList = YAHOO.util.Dom.get("active_search_strings");
				
			if (search_strings.data !== null) {
				var numOfSearches = search_strings.data.length || 'undefined';
				
				for (i = 0; i < numOfSearches; i++) {
					var searchId          = search_strings.data[i].id,
						searchQueryString = search_strings.data[i].search_title;
					
					tmpString += '<li id="search__' + searchId + '" class="search_string_item">' + searchQueryString + '</li>';
				}
				
				searchStringList.innerHTML = tmpString;
			} else {
				searchStringList.innerHTML = '<li class="list_message">This group has no searches defined!</li>';
			}
		},
		/**
		 * Fetch search results from the Twitter Search API
		 * @param callback
		 * @param url
		 * @param reference_string (ex) search_string, trend_item_id
		 * @param group_id
		 * @param searches_id
		 */
		doTwitterSearch : function (callback, url, reference_string, group_id, searches_id) {
			var that = this; //Needed to set proper scope in the callback
			
			var req = new XMLHttpRequest();
		   	req.onreadystatechange = function () { 
		        if (req.readyState === 4) {
					//Parsing JSON strings can throw a SyntaxError exception, so we wrap the call in a try catch block
					try {
						var jData = YAHOO.lang.JSON.parse(req.responseText);
						callback.call(that, jData, reference_string, group_id, searches_id);
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
		 * Generic function used to fetch external JSON data
		 * @param callback
		 * @param url
		 */
		fetchExternalJSONData : function (callback, url) {
			var that = this,
				req = new XMLHttpRequest();
		   	req.onreadystatechange = function () { 
		        if (req.readyState === 4) {
					//Parsing JSON strings can throw a SyntaxError exception, so we wrap the call in a try catch block
					try {
						var jData = YAHOO.lang.JSON.parse(req.responseText);
						callback.call(that, jData);
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
		 * Make sure we have the ability to turn off for maintenance if needed
		 * @param {Object} statusInfo
		 */
		healthCheck : function (statusInfo){
			if (!YAHOO.lang.isUndefined(statusInfo.status) && statusInfo.status !== 200) {
				//Stop the search process and display a predefined message
				this.rotationTimer = null;
				YAHOO.util.Dom.get("bd").innerHTML = statusInfo.status_message;
				YAHOO.util.Dom.addClass('bd', 'maintenance_mode');
			}
		},
		/**
		 * Process new tweets as they come in from the scheduled search process
		 * @param {Object} data
		 * @param search_string
		 * @param group_id
		 * @param searches_id
		 */
		processNewTweets : function (data, search_string, group_id, searches_id) {
			var countOfNewTweetsAdded = 0; //We only want to record/display each tweet once per group
			
			//Decrement the job count so we know when to display the search result notification (i.e.) after all the ajax requests have completed
			this.rotationJobCount--;
			
			if (YAHOO.lang.isObject(data) && YAHOO.lang.isObject(data.results) && data.results.length > 0) {
				//Reversed so oldest per group appears first
				for (var i = data.results.length - 1; i >= 0; i--) {
					var localTweetResult,
						local_tweet_id,
						tweet_text        = this.stripTags(data.results[i].text),
						to_user_id        = data.results[i].to_user_id, 
						from_user         = data.results[i].from_user,
						twitter_id        = data.results[i].id,
						from_user_id      = data.results[i].from_user_id,
						profile_image_url = data.results[i].profile_image_url,
						created_at        = data.results[i].created_at,
						nodeCheck         = YAHOO.util.Dom.get('tweet-gid' + group_id + '-tid' + twitter_id) || 'undefined';
					
					//Similar group search terms may return the same tweet.  We only want to record/display each tweet once per group.
					if (YAHOO.lang.isUndefined(nodeCheck) || nodeCheck === 'undefined') {
						countOfNewTweetsAdded = countOfNewTweetsAdded + 1;
						var regexos = new RegExp("((http|https|ftp|sftp):\/\/.*)?(" + search_string + ")", "gi");
						//Highlight matched search terms
						var hightlighted_text = tweet_text.replace(regexos, function($0, $1){
							return $1 ? $0 : '<span class="matched_search">' + $0 + '</span>';
						});
						//Replace link-look-alikes
						hightlighted_text = hightlighted_text.replace(/((\w+):\/\/[\S]+\b)/gim, '<a title="open in browser" class="tweet_link" href="$1" target="_blank">$1</a>');
						//Replace replies (i.e.) @someone
						hightlighted_text = hightlighted_text.replace(/@(\w+)/gim, '<a title="open in browser" class="tweet_link" href="http://twitter.com/$1" target="_blank">@$1</a>');
						
						try {
							//Add new tweet to the database
							localTweetResult = this.addTweet(hightlighted_text, to_user_id, from_user, twitter_id, from_user_id, profile_image_url, created_at, group_id, searches_id);		
							if (localTweetResult.data !== null) {
								local_tweet_id = localTweetResult.data[0].id;
							}
						} catch (e) {
							alert('Unable to add new tweet to database!');
						}
						
						//Construct a processed tweet object.  Will hand object off to addToTab.
						var processedTweet = {
							local_tweet_id: local_tweet_id,
							tweet_text: hightlighted_text,
							to_user_id: to_user_id,
							from_user: from_user,
							twitter_id: twitter_id,
							from_user_id: from_user_id,
							profile_image_url: profile_image_url,
							created_at: created_at,
							group_id: group_id,
							searches_id: searches_id
						};

						this.addToTab(processedTweet); //Add new tweet to matching group tab	
					}
				}
				
				//Keep track of the group total (newly added ones, not ones we have processed in prior search runs)
				this.tabStore[group_id].totalTweetCount += countOfNewTweetsAdded;
				//Keep track of the rotation total and call the system notification
				this.rotationTotal += countOfNewTweetsAdded;
				
				if (group_id !== this.getCurrentGrpId()) {
					//Update non-active tabs and tabStore with new record count
					this.tabStore[group_id].newTweetCount += countOfNewTweetsAdded;
					this.tabStore[group_id].nodeReference.innerHTML = this.buildTabText(this.tabStore[group_id].label, this.tabStore[group_id].newTweetCount);
				}
				
				//We will not have a SGT for Trends or Favs
				if (group_id !== this.tabStore.favoritesGrpID && group_id !== this.tabStore.trendsGrpID) {
					try {
						YAHOO.util.Dom.get("search_group_result_count").innerHTML = 'Search Group Total: ' + this.tabStore[this.getCurrentGrpId()].totalTweetCount;
					} catch (e) {}
				}
			}
			
			//Display notification as needed
			if (this.showDesktopNotifications === 1 && this.rotationJobCount === 0 && this.rotationTotal > 0) {
				this.displaySearchResultNotification(this.rotationTotal);
			}
			
			//Update starting point for next run
			var maxTwitterIdResult = this.getMaxTwitterIdForSearchTerm(searches_id);
			if (!YAHOO.lang.isNull(data)) {
				this.updateMaxTwitterIdForSearchTerm(maxTwitterIdResult.data[0].twitter_id, searches_id);
			}
		},
		/**
		 * Handle the tweet reply, fav, and link click actions
		 * @param {Object} eltarget
		 */
		handleTweetReplyFavRemove : function (eltarget) {
			var eltargetIdSplit = eltarget.id.split("__"), //(ex) reply__123__bobsmith 
				targetTask      = eltargetIdSplit[0],      //0=task
				targetTweetId   = eltargetIdSplit[1],      //1=twitter id
				targetUser      = eltargetIdSplit[2],      //2=username
				favGrpID        = this.tabStore.favoritesGrpID,
				favGrpString    = 'summary-group-' + favGrpID,
				tweetRightNode,
				tweetNode;
			
			if (targetTask === 'reply') {
				//Open users profile in popup
				this.openInBrowser('http://twitter.com/home?status=@' + targetUser);
			} else if (targetTask === 'remove') {
				tweetRightNode  = eltarget.parentNode;
				tweetNode       = tweetRightNode.parentNode;
					
				this.fadeThisOut(tweetNode, true);
				this.removeTweet(targetTweetId);
				
				//Are there any favs left?  If not give us back the empty block.
				if (YAHOO.util.Dom.getChildren(favGrpString).length <= 1) {
					YAHOO.util.Dom.get(favGrpString).innerHTML = '<p id="emptygroup__' + favGrpID + '">This group has no search results yet!</p>';
				}
			} else if (targetTask === 'fav') {
				//Update task and image to allow removals (i.e.) unfav
				eltarget.id  = 'remove__' + targetTweetId + '__' + targetUser;
				YAHOO.util.Dom.replaceClass(eltarget, 'fav_button', 'delete_button');
				
				//Add to favs
				tweetRightNode   = eltarget.parentNode;
				tweetNode        = tweetRightNode.parentNode;
				
				var tweetClone   = YAHOO.util.Dom.get(tweetNode).cloneNode(true),
					tweetClasses = YAHOO.util.Dom.get(tweetNode).className,
					emptyBlockID = 'emptygroup__' + favGrpID,
					emptyBlock   = YAHOO.util.Dom.get(emptyBlockID) || 'undefined'; //Are there any favs currently?
				
				YAHOO.util.Dom.replaceClass(tweetClone, tweetClasses, 'single-tweet detail-group-' + favGrpID); //The tweet is now in the fav group

				if (emptyBlock === 'undefined') {
					//This is not the first fav tweet
					var firstTweetInGroup = this.findFirstTweet(favGrpID) || 'undefined';
					YAHOO.util.Dom.insertBefore(tweetClone, firstTweetInGroup);
				} else {
					//This is the first tweet for the tab	
					YAHOO.util.Dom.insertAfter(tweetClone, emptyBlock);
					this.remove(emptyBlock);
				}
				
				YAHOO.util.Dom.setStyle(eltarget, 'visibility', 'hidden');
				this.markAsFavorite(targetTweetId);
			}
		},
		/**
		 * Used to fade out DOM elements
		 * @param {Object} elementToFade
		 * @param removeItToo (optional, removes element from DOM)
		 */
		fadeThisOut : function (elementToFade, removeItToo) {
			var that = this,
				fadeAnim;
				
			fadeAnim = new YAHOO.util.Anim(elementToFade, {
	        	opacity: { to: 0 }
	        }, 1, YAHOO.util.Easing.easeOut);
		
		    fadeAnim.animate(); //Run the fade out
			
			//Once the fade out is finished we hide the element completely
			fadeAnim.onComplete.subscribe(function () {
				if (removeItToo === true) {
					that.remove(elementToFade);
				} else {
					YAHOO.util.Dom.setStyle(elementToFade, 'display', 'none');
				}
			});
		},
		/**
		 * Used to fade in DOM elements / Activity Indicator
		 * @param {Object} elementToFade
		 */
		fadeThisIn : function (elementToFade) {
			var attributes = {
				backgroundColor: { from: '#FFFF99', to: '#171717' }
			};
		
			var fadeAnim = new YAHOO.util.ColorAnim(elementToFade, attributes);
			fadeAnim.animate();
		},
		/**
		 * Setup basic tooltip overlay
		 */
		setupTooltip : function () {
			//Build overlay based on markup
			var cOverlay = new YAHOO.widget.Overlay("tooltip", { context: ["ctt","tl","br"],
																  visible: false,
																  fixedcenter: true,
																  width: "300px",
																  height: "auto",
																  underlay: "shadow" });

			cOverlay.render();

			YAHOO.util.Event.addListener("information", "mouseover", cOverlay.show, cOverlay, true);
			YAHOO.util.Event.addListener("information", "mouseout", cOverlay.hide, cOverlay, true);
		},
		/**
		 * Setup the YUI slider control for adjusting the search query rate
		 */
		setupRefreshRateSlider : function () {
			var bg           = "slider-bg",
		        convertedval = "slider-converted-value",
				scaleFactor  = 18,  //Scale factor for converting the pixel offset into a real value
				keyIncrement = 20;  //The amount the slider moves when the value is changed with the arrow
	
		    YAHOO.AIR.Sideline.slider = YAHOO.widget.Slider.getHorizSlider("slider-bg", "slider-thumb", 0, 200, 20);
		    YAHOO.AIR.Sideline.slider.animate = true;
			
			//Restore current setting from stored prefs and animate to proper position
			YAHOO.AIR.Sideline.slider.setValue((this.searchRefreshRate / 6) * 20, false);
		
		    YAHOO.AIR.Sideline.slider.getRealValue = function() {
				var rv = Math.round(this.getValue() * scaleFactor) / 60;
				if (rv === 0) {
					rv = 1; //1 min refresh is the minimum
				}
				
		        return rv;
		    };
		
		    YAHOO.AIR.Sideline.slider.subscribe("change", function(offsetFromStart) {
		        //Use the scale factor to convert the pixel offset into a real value
				var fld = YAHOO.util.Dom.get(convertedval),
					actualValue = YAHOO.AIR.Sideline.slider.getRealValue();
		        
				fld.innerHTML = actualValue;
		
		        //Update the title attribute to aid assistive technology
		        YAHOO.util.Dom.get(bg).title = "slider value = " + actualValue;
		    });
		},
		/**
		 * Used to find the groupid of the active tab
		 */
		getCurrentGrpId : function () {
			var grpIdResult,
				activeTab = YAHOO.util.Selector.query('li.selected a em'),
				tabText   = this.getRawTabText(activeTab[0].innerHTML);
				
			if (tabText === 'Trends') {
				return -1; //There is no trend group in the database
			} else {
				grpIdResult = this.getGroupIdFromString(tabText) || 'undefined';
			
				if (grpIdResult === 'undefined') {
					return 'undefined';
				} else {
					return grpIdResult.data[0].id;
				}
			}
		},
		/**
		 * Used to locate the first tweet on a tab so that we can append new tweets to the top
		 * @param {Object} groupid
		 */
		findFirstTweet : function (groupid) {
			var groupContainerNode = YAHOO.util.Dom.get('summary-group-' + groupid) || 'undefined';
	
			if (groupContainerNode !== 'undefined') {
				var firstTweet = YAHOO.util.Dom.getFirstChild(groupContainerNode) || 'undefined';
				if (firstTweet !== 'undefined') {
					return firstTweet;
				}
			}
			
			return false;
		}
	};
	
	/**
	 * Sideline misc utility functions
	 */
	YAHOO.AIR.SidelineUtil = function () {};
	YAHOO.AIR.SidelineUtil.prototype = {
		/**
		 * Used to scan for and record new matched tweets. Scheduled via setInterval.
		 */
		dataRotation : function () {
			var i,
				twitterRequestUrl = 'http://search.twitter.com/search.json?',
				sidelineGroups    = this.getAllSidelineGroups(), //Start by getting the active group (refetching in case they have changed since startup)
				numOfGroups       = sidelineGroups.data.length;
			
			//Reset the rotation counters
			this.rotationJobCount = this.getCountOfActiveQueries();
			this.rotationTotal    = 0;
			
			if (numOfGroups > 0) {
				 this.doProgressIndicator(1);
				
				//Identify and perform the various searches per group
				for (i = 0; i < numOfGroups; i++) {
					var j,
						tmpUrl,
						tmpQ,
						search_string,
						numOfGroupsQueries = 0,
						crtGroupQueries    = this.getSidelineGroupQueries(sidelineGroups.data[i].id);	
					
					if (crtGroupQueries.data !== null) {
						numOfGroupsQueries = crtGroupQueries.data.length;
						
						//Run a search/append for each query string
						for (j = 0; j < numOfGroupsQueries; j++) {
							tmpUrl = twitterRequestUrl + crtGroupQueries.data[j].actual_query_string + '&lang=en';
							
							if (crtGroupQueries.data[j].twitter_starting_point !== '' && crtGroupQueries.data[j].twitter_starting_point > 0) {
								tmpUrl += '&since_id=' + crtGroupQueries.data[j].twitter_starting_point;
							}
							
							//Build search string for the processNewTweets regex (it's what becomes highlighted)
							search_string = '';
							if (crtGroupQueries.data[j].q !== '') {
								tmpQ = crtGroupQueries.data[j].q;
								//Simple queries are often contained in double quotes. This is fine for the query, but they will
								//not be in the string for regex comparsion so remove leading/trailing double quote as needed here
								if (tmpQ.charAt(0) === '"') {
									tmpQ = tmpQ.substr(1, tmpQ.length);
								}
								//Remove trailing quote if needed
								if (tmpQ.charAt(tmpQ.length - 1) === '"') {
									tmpQ = tmpQ.substr(0, tmpQ.length - 1);
								}
								
								tmpQ = tmpQ.replace(/\+or\+/gi, "|");
								tmpQ = tmpQ.replace(/\+/g, "|");
								search_string += tmpQ.replace(/"\|"/g, "|");
							}
							if (crtGroupQueries.data[j].ands !== '') {
								search_string += crtGroupQueries.data[j].ands.replace(/\+/ig, "|");
							}
							if (crtGroupQueries.data[j].ors !== '') {
								search_string += crtGroupQueries.data[j].ors.replace(/\+/ig, "|");
							}
							if (crtGroupQueries.data[j].phrase !== '') {
								search_string += crtGroupQueries.data[j].phrase.replace(/\+/ig, " ");
							}
							if (crtGroupQueries.data[j].tag !== '') {
								search_string += crtGroupQueries.data[j].tag.replace(/\+/ig, " ");
							}
							if (crtGroupQueries.data[j].user_from !== '') {
								search_string += crtGroupQueries.data[j].user_from.replace(/\+/ig, " ");
							}
							if (crtGroupQueries.data[j].user_to !== '') {
								search_string += crtGroupQueries.data[j].user_to.replace(/\+/ig, " ");
							}
							if (crtGroupQueries.data[j].ref !== '') {
								search_string += crtGroupQueries.data[j].ref.replace(/\+/ig, " ");
							}
							
							try {
								//Note: encodeURI is used over encodeURIComponent because we don't want to encode the "+" for Twitter.
								//However, the "#" does require encoding so we handle after the initial encode.
								this.doTwitterSearch(this.processNewTweets, encodeURI(tmpUrl).replace(/#/g, '%23'), search_string, sidelineGroups.data[i].id, crtGroupQueries.data[j].id);
							} catch(e) {}
						}
					}
				}
				
				this.doProgressIndicator(0);
			}
		},
		/**
		 * Used to fetch Twitters currently trending topic list 
		 */
		getTwitterTrends : function () {
			//Start by verifying we have a trends tab (it is not in the database, but rather added dynamically)
			if (!YAHOO.lang.isUndefined(this.tabStore.trendsGrpID)) {
				try {
					this.fetchExternalJSONData(this.processTwitterTrends, 'http://search.twitter.com/trends.json');
				} catch(e) {}	
			} else {
				this.refreshTabStore();
			}		
		},
		/**
		 * Processes the Trend JSON data returned from Twitter
		 * @param {Object} data
		 * Note: Data sample below
		 * {"as_of":"Wed, 04 Feb 2009 20:08:01 +0000",
		 *	 "trends":[
		 *		{"name":"#TED","url":"http:\/\/search.twitter.com\/search?q=%23TED"}
		 *	  ]
		 * }
		 */
		processTwitterTrends : function (data) {
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
		},
		/**
		 * Handles onclick actions for the trending list.
		 * @param {Object} e
		 */
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
			}
		},
		/**
		 * Display several tweets as a preview for selected Trending topic
		 * @param {Object} jData
		 * @param {Object} domid
		 * @param {Object} group_id
		 */
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
		/**
		 * Used to cleanup and properly format the search form data submitted or imported by the user
		 * @param {Object} inputData
		 */
		processSearchDialogData : function(inputData) {
			var formData = this.stripTags(YAHOO.lang.trim(inputData));
			return formData.replace(/ /gi, '+');
		},
		/**
		 * Used to create system notifications displayed when new search results are found
		 */
		displaySearchResultNotification : function() {
			var that    = this,
				options = new air.NativeWindowInitOptions();
				
			options.type = "lightweight";
			options.transparent  = true;
			options.systemChrome = air.NativeWindowSystemChrome.NONE;
			
			var notificationHTML,
				notificationTimer, 
				visibleBounds = air.Screen.mainScreen.visibleBounds, 
				windowBounds  = new air.Rectangle(visibleBounds.right - 300 - 40, 40, 300, 200);
				
			//We keep a global reference to this object so that we can be sure to close notification windows on quit as well
			this.desktopNotificationLoader = air.HTMLLoader.createRootWindow(true, options, true, windowBounds);
			
			//Make the body background transparent
			this.desktopNotificationLoader.paintsDefaultBackground = false;
			
			//Define the markup for our notification window
			notificationHTML = '<html>' +
									'<head><title>Sideline Notification</title></head>' +
									'<body style="opacity: 0.5;">' +
										'<div style="color: white; background-color: black; padding: 20px; margin: 10px; -webkit-border-radius: 10px; -webkit-box-shadow: 0px 0px 10px #000;">' +
											'<h1 style="font-size: 14px;">Sideline Notification</h1>' +
											'<p style="font-size: 12px;">You have ' +
											this.rotationTotal +
											' new search results</p>' +
										'</div>' +
									'</body>' +
									'</html>';
									
			this.desktopNotificationLoader.loadString(notificationHTML);
			this.desktopNotificationLoader.stage.nativeWindow.alwaysInFront = true;
			this.desktopNotificationLoader.stage.nativeWindow.height = this.desktopNotificationLoader.window.document.height;
			
			//Window is automatically removed after so many seconds
			notificationTimer = setTimeout(function(){
				try {
					that.desktopNotificationLoader.stage.nativeWindow.close();
					that.desktopNotificationLoader = null;
				} catch(e) {}
			}, 5000);
			
			//Allow users to manually dismiss the window
			this.desktopNotificationLoader.addEventListener("click", function(){
				clearTimeout(notificationTimer);
				try {
					that.desktopNotificationLoader.stage.nativeWindow.close();
					that.desktopNotificationLoader = null;
				} catch(e) {}
			});
		},
		/**
		 * AIR process to check for and handle application updates
		 */
		doSidelineUpdateCheck : function() {
			//Instantiate an updater object and set the URL for the update.xml file
			var appUpdater = new runtime.air.update.ApplicationUpdaterUI();
			appUpdater.updateURL = "http://sideline.yahoo.com/updater/update.xml";
			
			appUpdater.addEventListener(runtime.air.update.events.UpdateEvent.INITIALIZED, function () {
		    	appUpdater.checkNow();
			});
			appUpdater.addEventListener(runtime.flash.events.ErrorEvent.ERROR, function () {
				alert(event);
			});
			
			appUpdater.isCheckForUpdateVisible = false;
			appUpdater.isFileUpdateVisible     = false;
			appUpdater.isInstallUpdateVisible  = false;
			appUpdater.initialize();
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
		 * Used open links in the default browser
		 * http://livedocs.adobe.com/labs/air/1/jslr/flash/net/navigateToURL.html
		 * @param {Object} url
		 */
		openInBrowser : function (url) {
			var variables, request;
            variables = new air.URLVariables();
            request   = new air.URLRequest(url);
            //request.data = variables;
            try {            
                air.navigateToURL(request);
            } catch (e) {
                alert('Unable to open link!  Please try again.');
            }
		},
		/**
		 * Used to locate and start import of a json data file of search groups and related search terms
		 * Note: Pre-formatted json files can be used as input.  See README.markdown for information.
		 */
		importSearchGrps : function() {
			var that = this, 
				fileToOpen,
				txtFilter;
				
			fileToOpen = new air.File();
			txtFilter  = new air.FileFilter("Text", "*.ssf");
			
			try {
			    fileToOpen.browseForOpen("Open", [txtFilter]);
			    fileToOpen.addEventListener(air.Event.SELECT, function(event) {
					/**
					 * Processes a pre-defined json data file of search groups and related search terms
					 * 
					 * Note: Below is an example of the expected json input format
					 * {"searches" : [
					 *       {
					 *           "search_group_name": "Sample Query Group",
					 *           "search_terms":
					 *           [
					 *               { 
					 *                   "search_title": "Test",
					 *                   "simple_query": "test",
					 *                   "ands": "", 
					 *                   "ors": "", 
					 *                   "phrase": "", 
					 *                   "tag": "", 
					 *                   "user_from": "", 
					 *                   "user_to": "", 
					 *                   "ref": "", 
					 *                   "positive_attitude": "false",  
					 *                   "negative_attitude": "false", 
					 *                   "ask_question": "false" 
					 *               },
					 *               ...
					 *           ]
					 *       }
					 *   ]
					 * }
					 */
					var stream, 
						fileData,
						grpsData;
						 
					stream = new air.FileStream();
					stream.open(event.target, air.FileMode.READ);
					fileData = stream.readUTFBytes(stream.bytesAvailable);
					
					grpsData = YAHOO.lang.JSON.parse(fileData);
					
					if (YAHOO.lang.isObject(grpsData) && YAHOO.lang.isArray(grpsData.searches) && grpsData.searches.length > 0) {
						var groupName, tabLabel, newGroupResult, newGroupId, actualQueryString, searchTermData, searchItem,
							title, q, ands, phrase, ors, nots, tag, user_from, user_to, ref, pa, na, aq;
						
						//Create each new search group
						for (var i = 0; i < grpsData.searches.length; i++) {
							groupName      = grpsData.searches[i].search_group_name;
							newGroupResult = that.addNewSearchGroup(groupName);
							
							if (!YAHOO.lang.isNull(newGroupResult.data)) {
								newGroupId = newGroupResult.data[0].id;
								
								for (var j = 0; j < grpsData.searches[i].search_terms.length; j++) {
									searchTermData = grpsData.searches[i].search_terms[j];
									title          = searchTermData.search_title;
									q              = that.processSearchDialogData(searchTermData.simple_query);
									ands           = that.processSearchDialogData(searchTermData.ands);
									ors            = that.processSearchDialogData(searchTermData.ors);
									nots           = that.processSearchDialogData(searchTermData.nots);
									phrase         = that.processSearchDialogData(searchTermData.phrase);
									tag            = that.processSearchDialogData(searchTermData.tag);
									user_from      = that.processSearchDialogData(searchTermData.user_from);
									user_to        = that.processSearchDialogData(searchTermData.user_to);
									ref            = that.processSearchDialogData(searchTermData.ref);
									pa             = searchTermData.positive_attitude;
									na             = searchTermData.negative_attitude;
									aq             = searchTermData.ask_question;
									
									//Construct query string
									actualQueryString = 'q='       + q +
														'&ands='   + ands +
														'&phrase=' + phrase +
														'&ors='    + ors +
														'&nots='   + nots +
														'&tag='    + tag +
														'&from='   + user_from +
														'&to='     + user_to +
														'&ref='    + ref +
														'&rpp='    + 100;
									
									if (pa === "true") {
										actualQueryString += '&tude[]=:)';
									}
									if (na === "true") {
										actualQueryString += '&tude[]=:(';
									}
									if (aq === "true") {
										actualQueryString += '&tude[]=?';
									}
									
									searchItem = {
										group_id: newGroupId,
										search_title: title,
										actual_query_string: actualQueryString,
										q: q,
										ands: ands,
										ors: ors,
										nots: nots,
										phrase: phrase,
										tag: tag,
										user_from: user_from,
										user_to: user_to,
										ref: ref,
										pa: pa,
										na: na,
										aq: aq
									};
									
									that.addSearchItem(searchItem);
								}
								
								//New group was created so add the tab and make it active
								tabLabel = that.buildTabText(grpsData.searches[i].search_group_name);
								that.tabView.addTab(new YAHOO.widget.Tab({
									label: tabLabel,
									active: false,
									content: '<div id="summary-group-' + newGroupId + '" class="tweet-container summary-group-' + newGroupId + '">' +
									'<p id="emptygroup__' + newGroupId + '">This group has no search results yet!</p><div>'
								}));
							}
						}
						
						//Cache the new tab details, update click handlers, and set active tab to the newly added tab
						that.remove(YAHOO.util.Dom.get("add_new_group"));
						that.refreshTabStore();
						that.setupNewTabButton();
						//Note: We set this way instead of in addTab to make sure the activeTabChange event fires
						that.tabView.set('activeIndex', that.tabStore.tabCount - 1);
					}
					else {
						alert('Invalid input file!  Unable to complete import process.');
					}
				});
			} catch (error) {
			    air.trace("Failed:", error.message);
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
	YAHOO.AIR.SidelineDB = function () {};
	YAHOO.AIR.SidelineDB.prototype = {
		db : null,
		dbFile : null,
		/**
		 * Executes a SQL statement against the database and return the results
		 * @param {Object} sql
		 */
		doQuery : function (sql, sqlParameters) {
			var stmt           = new air.SQLStatement();
			stmt.sqlConnection = this.db;
			stmt.text          = sql;
			
			if (YAHOO.lang.isObject(sqlParameters) && sqlParameters[0] !== 'undefined') {
	            for (var i = 0; i < sqlParameters.length; i++) {
					stmt.parameters[i] = sqlParameters[i];
				}
			}
	        
			try {
				stmt.execute();
			} catch (error) {
				air.trace("Error executing SQL:", error);
				air.trace(error.message);
				air.trace(stmt.text);
				return;
			}
			
			return stmt.getResult();
		},
		/**
		 * Remove all non-fav tweets older than 3 hours
		 */
		dbCleanup : function () {
			var deleteSQL = "DELETE FROM tweets" + 
							" WHERE strftime('%Y-%m-%d %H:%M:%S', loaded_at) < strftime('%Y-%m-%d %H:%M:%S', datetime('now'), '-3 hours')" + 
							" AND sideline_group_id <> " + this.tabStore.favoritesGrpID;
			this.doQuery(deleteSQL);
		},
		/**
		 * Adds new search group
		 * @param {Object} group_name
		 */
		addNewSearchGroup : function (group_name) {
			var lastId,
				sqlParameters = [ group_name ],
				insertSQL     = "INSERT INTO search_groups VALUES (NULL, ?, 'Y')";
				
			this.doQuery(insertSQL, sqlParameters);
			lastId = this.doQuery("SELECT last_insert_rowid() as id");
				
			return lastId;
		},
		/**
		 * Updates an existing search group
		 * @param {Object} group_name
		 */
		updateSearchGroup : function (old_group_name, new_group_name) {
			var searchGrpResult = this.getGroupIdFromString(old_group_name),
				searchGrpId     = searchGrpResult.data[0].id,
				sqlParameters   = [],
				updateSQL       = "UPDATE search_groups SET group_name = ? WHERE id = ?";
				
				sqlParameters[sqlParameters.length] = new_group_name;
				sqlParameters[sqlParameters.length] = searchGrpId;
				
			this.doQuery(updateSQL, sqlParameters);
			
			return searchGrpId;
		},
		/**
		 * Returns all tweets for passed groups
		 * @param {Object} sideline_group_id
		 */
		getTweets : function (sideline_group_id) {
			var sqlParameters = [ Number(sideline_group_id) ],
				selectSQL 	  = "SELECT id, text, from_user, twitter_id, profile_image_url, created_at, sideline_group_id, searches_id FROM tweets" +
						        " WHERE sideline_group_id = ?" +
						        " ORDER BY twitter_id DESC",
				tweetResults  = this.doQuery(selectSQL, sqlParameters);
				
			return tweetResults;
		},
		/**
		 * Returns count of tweets/search results for passed search group
		 * @param {Object} sideline_group_id
		 */
		getTweetCountForSearchGroup : function (sideline_group_id) {
			var tweetCount    = 0,
				sqlParameters = [ Number(sideline_group_id) ],
				selectSQL 	  = "SELECT count(id) AS tweet_count FROM tweets" +
						        " WHERE sideline_group_id = ?",
				tweetResults  = this.doQuery(selectSQL, sqlParameters);
				
				if (tweetResults !== null && tweetResults.data.length === 1) {
					tweetCount = Number(tweetResults.data[0].tweet_count);
				}
				
			return tweetCount;
		},
		/**
		 * Returns search parameters for a previously created search condition
		 */
		getSearchItemParams : function(search_id) {
			var sqlParameters = [ Number(search_id) ],
				selectSQL = "SELECT id, group_id, search_title, q, ands, ors, nots, phrase, tag, user_from, user_to, ref, pa, na, aq" +
			 				" FROM searches WHERE id = ?",
				searchParamResult = this.doQuery(selectSQL, sqlParameters);
				
			return searchParamResult;
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
		getUserPreferences : function () {
			var userPreferencesData,
				selectSQL = "SELECT show_desktop_notifications, refresh_rate FROM user_preferences";
			
			userPreferencesData = this.doQuery(selectSQL);
			return userPreferencesData;
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
		addTweet : function (text, to_user_id, from_user, twitter_id, from_user_id, profile_image_url, created_at, group_id, searches_id) {
			var lastId,
				sqlParameters = [],
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
		
			this.doQuery(insertSQL, sqlParameters);
			lastId = this.doQuery("SELECT last_insert_rowid() as id");
			
			return lastId;
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
		getGroupIdFromString : function (group_string) {
			var sqlParameters = [ group_string ],
				selectSQL     = "SELECT id FROM search_groups WHERE group_name = ?",
				grpId         = this.doQuery(selectSQL, sqlParameters);
				
			return grpId;	
		},
		/**
		 * Returns group name of the passed group id
		 * @param {Object} group_id
		 */
		getGroupStringFromId : function (group_id) {
			var sqlParameters = [ group_id ],
				selectSQL     = "SELECT group_name FROM search_groups WHERE id = ?",
				grpString     = this.doQuery(selectSQL, sqlParameters);
				
			return grpString;
		},
		/**
		 * Returns all search strings defined for passed group
		 * @param {Object} sideline_group_id
		 */
		getSidelineGroupQueries : function (sideline_group_id) {
			var sqlParameters        = [ Number(sideline_group_id) ],
				selectSQL            = "SELECT id, group_id, search_title, actual_query_string, q, ands, ors, nots, phrase, tag, user_from, user_to, ref, twitter_starting_point" +
										" FROM searches WHERE active='Y' AND group_id = ?",
				twitterQueryStrings  = this.doQuery(selectSQL, sqlParameters);
				
			return twitterQueryStrings;
		},
		/**
		 * Returns the total number of active searches
		 */
		getCountOfActiveQueries : function () {
			var selectSQL                = "SELECT count(id) as total_search_count" +
										    " FROM searches WHERE active='Y'",
				activeSearchCount        = 0,
				activeSearchCountResults = this.doQuery(selectSQL);
				
				if (activeSearchCountResults !== null && activeSearchCountResults.data.length === 1) {
					activeSearchCount = Number(activeSearchCountResults.data[0].total_search_count);
				}
				
			return activeSearchCount;
		},
		/**
		 * Returns the max twitter id for given search term.  Used as starting point when querying the Twitter Search API.
		 * @param {Object} searches_id
		 */
		getMaxTwitterIdForSearchTerm : function (searches_id) {
			var sqlParameters = [ Number(searches_id) ],
				selectSQL     = "SELECT MAX(twitter_id) as twitter_id FROM tweets WHERE searches_id = ?",
				maxTwitterId  = this.doQuery(selectSQL, sqlParameters);
				
			return maxTwitterId;
		},
		/**
		 * Updates the max twitter id for given search term.  Used as starting point when querying the Twitter Search API.
		 * @param {Object} searches_id
		 */
		updateMaxTwitterIdForSearchTerm : function (twitter_id, searches_id) {
			var sqlParameters = [],
				selectSQL     = "UPDATE searches SET twitter_starting_point = ? WHERE id = ?";
			
			sqlParameters[sqlParameters.length] = Number(twitter_id);	
			sqlParameters[sqlParameters.length] = Number(searches_id);
			
			this.doQuery(selectSQL, sqlParameters);
		},
		/**
		 * Get active search groups with search result entries
		 */
		getSidelineGroups : function () {
			var selectSQL = "SELECT tg.id as id, tg.group_name as group_name FROM search_groups tg, tweets t" +
							" WHERE tg.active='Y' AND tg.id=t.sideline_group_id" +
							" GROUP BY tg.id" +
							" ORDER BY group_name ASC",
				sidelineGroups = this.doQuery(selectSQL);
			
			return sidelineGroups;
		},
		/**
		 * Get all active search groups
		 */
		getAllSidelineGroups : function () {
			var selectSQL = "SELECT id, group_name FROM search_groups WHERE active='Y' ORDER BY id ASC",
			sidelineGroups = this.doQuery(selectSQL);
		
			return sidelineGroups;
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
		addSearchItem : function (searchItemObject) {
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
				
			this.doQuery(insertSQL, sqlParameters);
			lastId = this.doQuery("SELECT last_insert_rowid() as id");
			
			return lastId;
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
		updateSearchItem : function (searchId, searchItemObject) {
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
				
			this.doQuery(updateSQL, sqlParameters);
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
		
		var chAir = new YAHOO.AIR.Sideline();
		YAHOO.lang.augment(YAHOO.AIR.Sideline, YAHOO.AIR.SidelineDB);   //Add database functionality
		YAHOO.lang.augment(YAHOO.AIR.Sideline, YAHOO.AIR.SidelineUtil); //Add utility support as well	
		
		//Setup our SQLite database
		chAir.db = new air.SQLConnection();
		chAir.dbFile = air.File.applicationStorageDirectory.resolvePath("sideline_v1.db");
		
		if (!chAir.dbFile.exists) {
			var dbTemplate = air.File.applicationDirectory.resolvePath("sideline_base.db");
			dbTemplate.copyTo(chAir.dbFile, true);
		}
		
		try {
			chAir.db.open(chAir.dbFile);
			chAir.db.compact(); //Vacuum/cleanup database for optimal performance
		} catch (error) {
			air.trace("DB error:", error.message);
			air.trace("Details:", error.details);
		}
		
		//Apply a temporary fix for Windows environments to work around an AIR font rendering issue
		if (navigator.platform.indexOf("Win") === 0) {
			YAHOO.util.Dom.addClass(document.body, "windowsFontFix");
		}
		
		//Configure sideline per user preferences
		var userPreferencesData = chAir.getUserPreferences();
		if (!YAHOO.lang.isNull(userPreferencesData) && !YAHOO.lang.isNull(userPreferencesData.data)) {
			chAir.showDesktopNotifications = userPreferencesData.data[0].show_desktop_notifications;
			chAir.searchRefreshRate = userPreferencesData.data[0].refresh_rate;
		} else {
			//Defaults
			chAir.showDesktopNotifications = 1;
			chAir.searchRefreshRate = 1;
		}
		
		//Create tabs and dialogs
		chAir.tabView = new YAHOO.widget.TabView();
		chAir.setupSidelineTabs();
		chAir.setupTooltip();
		chAir.setupRefreshRateSlider();
		chAir.searchDialogBuilder();
		chAir.searchGrpDialogBuilder();
		chAir.renameSearchGrpDialogBuilder();
		chAir.searchGrpRemovalDialog();
		chAir.searchRateDialogBuilder();
		
		//Setup native window event handlers
		window.nativeWindow.addEventListener(air.Event.CLOSING, function(event) {
			//Stop the normal application close event and make sure to close all windows, not just the main one
			event.preventDefault();
			for (var i = air.NativeApplication.nativeApplication.openedWindows.length - 1; i >= 0; i--) {
				air.NativeWindow(air.NativeApplication.nativeApplication.openedWindows[i]).close();
			}
		});
		YAHOO.util.Event.on('hd', 'mousedown', function() {
			window.nativeWindow.startMove();
		});
		
		/**
		 * Perform database cleanup on startup and schedule for every 3ish hours thereafter
		 * Note: Tweets are cleared from the database, but not the DOM.  Will not be redrawn on next app startup. 
		 */
		chAir.dbCleanup();
		setInterval(function () {
			chAir.dbCleanup();
		}, 10860000);
		
		//Additional event handlers
		YAHOO.util.Event.on('active_search_container', 'click', chAir.activeSearchHandler, chAir, true);
		YAHOO.util.Event.on('twitter_trend_list', 'click', chAir.handleTrendEvents, chAir, true);
		YAHOO.util.Event.on('tweetainer', 'click', function(e) {
			//Presents the search group removal confirmation dialog when tab close is requested
			var eltarget = YAHOO.util.Event.getTarget(e);
			if (YAHOO.util.Dom.hasClass(eltarget, "close-search-group")) {
				chAir.searchGrpRemoval.show();
			} else if (YAHOO.util.Dom.hasClass(eltarget, "fav_reply_remove")) {
				//Handle the tweet reply, fav, remove click actions
				chAir.handleTweetReplyFavRemove(eltarget);
			} else if (YAHOO.util.Dom.hasClass(eltarget, 'tweet_link')) {
				//Handle the tweet link click actions
				YAHOO.util.Event.preventDefault(e);
				chAir.openInBrowser(eltarget.href);
			}
		});	
		YAHOO.util.Event.on('yui_link', 'click', function(e) {
			YAHOO.util.Event.preventDefault(e);
			var eltarget = YAHOO.util.Event.getTarget(e);
			chAir.openInBrowser(eltarget.href);
		});
		YAHOO.util.Event.on('manual_refresh', 'click', function() {			
			chAir.doIntermediateDataRotation.call(chAir);
		}, chAir, true);
		
		//Construct the options menu
		YAHOO.util.Event.onContentReady("options_menu", function () {
			//Menu item selection handler
			function onMenuItemClick(p_sType, p_aArgs, p_oValue){
				//Gather details about the selected menu entry
				var currentProperty = this.cfg.getProperty("checked"), itemTitle = this.value;
				
				if (itemTitle === 'notification') {
					this.cfg.setProperty("checked", !currentProperty);
					chAir.showDesktopNotifications = Number(!currentProperty);
					chAir.saveUserPreferences();
					
				} else if (itemTitle === 'import') {
					chAir.importSearchGrps(); //Run the local file import process
				} else if (itemTitle === 'help') {
					chAir.openInBrowser('http://sideline.yahoo.com/help.php');
				} else if (itemTitle === 'rate') {
					chAir.searchRateDialog.show();
				}
			}
		
			//Create an array of YAHOO.widget.MenuItem configuration properties
			var aMenuButtonMenu = [
				{ text: "Import Search Groups", value: "import", onclick: { fn: onMenuItemClick } },
	            { text: "Show Notifications", value: "notification", checked: !!chAir.showDesktopNotifications, onclick: { fn: onMenuItemClick } },
				{ text: "Adjust Refresh Rate", value: "rate", onclick: { fn: onMenuItemClick } },
				{ text: "Help", value: "help", onclick: { fn: onMenuItemClick } }
			];
		
			//Instantiate a Menu Button using the array of YAHOO.widget.MenuItem 
			var oMenuButton = new YAHOO.widget.Button({ type: "menu", 
														label: "Options", 
														name: "menubutton", 
														menu: aMenuButtonMenu, 
														container: this });
		});     
		
		//Run Trend fetcher on startup and schedule for every 5 mins thereafter (while the application is open that is)
		chAir.getTwitterTrends();
		setInterval(function () {
			chAir.getTwitterTrends();
		}, 300000);
		
		//Run Tweet fetcher on startup and schedule for future runs thereafter (while the application is open that is)
		chAir.dataRotation();
		chAir.rotationTimer = setInterval(function () {
								chAir.dataRotation();
							}, chAir.searchRefreshRate * 60000);
		
		/**
		 * Do update and healthchecks.  The healthchecks are done as a safety precaution so 
		 * that we can put the application in maintenance mode in the event that a security issue 
		 * is identified.  We'd take it out if we could, but our security policy prohibits this.
		 */
		chAir.doSidelineUpdateCheck();
		var airApplicationVersion, appXML, xmlObject;
    	appXML    = air.NativeApplication.nativeApplication.applicationDescriptor;
   		xmlObject = (new DOMParser()).parseFromString(appXML, "text/xml");
    	airApplicationVersion = xmlObject.getElementsByTagName('version')[0].firstChild.nodeValue;
		chAir.fetchExternalJSONData(chAir.healthCheck, 'http://sideline.yahoo.com/status.php?appversion=' + airApplicationVersion);
		
	})();

});