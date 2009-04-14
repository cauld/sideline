YAHOO.util.Event.onDOMReady(function () {
	YAHOO.namespace("TI");
	
	//Sideline base object definition
	YAHOO.TI.Sideline = function () {
		var rotationTimer = 0;
		var rotationJobCount = 0;
		var	rotationTotal = 0;
	};
	
	//Sideline prototype definition
	YAHOO.TI.Sideline.prototype = {
	  tabView: null,
		tabStore: [],
		showDesktopNotifications: null,
		searchRefreshRate: null,
		desktopNotificationLoader: null
	};
	
	/**
	 * Sideline misc utility functions
	 */
	YAHOO.TI.SidelineUtil = function () {};
	YAHOO.TI.SidelineUtil.prototype = {
	  /**
		 * Used to handle tab construction during initial app load
		 */
		setupSidelineTabs : function () {
			var that = this;
			this.getAllSidelineGroups
			
			this.executeSQL(this.sql.getAllSidelineGroups, {
			  success: function(tx,sidelineGroups) {
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
    			for (var i = 0; i < sidelineGroups.rows.length; i++) {
    			  this.executeSQL(this.sql.getTweets,{
    			    sqlParameters:sidelineGroups.rows[i].id,
    			    success: function(tx,grpTweets) {
    			      var tweetStr = '';
        			  var teetStrParts = [];
        			  var tabLabel = '';
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
    			  });
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
			  }
			});
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
				  this.executeSQL(this.sql.getGroupIdFromString, {
				    sqlParameters:[tabText],
				    success: function(tx,results) {
				      
				    }
				  });
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
		 * Used to get tab text without the tweet count and/or close button html
		 */
		getRawTabText : function(tabTextString) {
			var tt = tabTextString.replace(/<span.*><\/span>/, ''); //deal with tab buttons
			tt = YAHOO.lang.trim(tt.replace(/\(\d+\)/gi, '')); //deal with tweet count
			return tt;
		},
	};
	
	/**
	* Sideline database API
	*/
	YAHOO.TI.SidelineDB = function () {};
	YAHOO.TI.SidelineDB.prototype = {
	  db: null,
	  //Execute a given SQL statement with the given options
	  executeSQL: function(sql,options) {
	    var opts = {
	      sqlParameters:[],
	      success: function(tx,result) {},
	      error: function(tx,error) {
	        console.log(error+": "+error.message);
	      }
	    };
	    
	    //Override defaults, if given
	    if (typeof options !== 'undefined') {
	      if (typeof options.sqlParameters !== 'undefined') {
	        opts.sqlParameters = options.sqlParameters;
	      }
	      if (typeof options.success !== 'undefined') {
	        opts.success = options.success;
	      }
	      if (typeof options.error !== 'undefined') {
	        opts.error = options.error;
	      }
	    }
	    
	    //Execute the given statement
	    this.db.transaction(function(tx) {
	      tx.executeSql(sql,opts.sqlParameters,opts.success,opts.error);
	    });
	    
	  },
	  initializeSidelineDatabase: function(callback) {
	    var sideline = this;
	    //begin the daisy chain of table create statments and initialization... grr...
  		sideline.executeSQL(sideline.sql.createSearchGroups,{
  		  success: function(tx,results) {
  		    //After search groups created, check to see if empty.  If so, insert Favorites
  		    sideline.executeSQL(sideline.sql.getAllSidelineGroups,{
  		      success: function(tx,results) {
  		        if (results.rows.length <= 0) {
  		          sideline.executeSQL(sideline.sql.insertFavorites);
  		        }
  		        //Wait a second to allow the row to be inserted, then continue with initialization
  		        setTimeout(function() {
  		          sideline.executeSQL(sideline.sql.createSearches,{
        		      success: function(tx,results) {
        		        sideline.executeSQL(sideline.sql.createUserPreferences,{
            		      success: function(tx,results) {
                        sideline.executeSQL(sideline.sql.createTweets,{
                		      success: function(tx,results) {
                            //Initialize application once database has been initialized
                            sideline.executeSQL(sideline.sql.getUserPreferences,{
                              success: function(tx,results) {
                                if (results.rows.length > 0) {
                                  sideline.showDesktopNotifications = results.rows[0].show_desktop_notifications;
                            			sideline.searchRefreshRate = results.rows[0].refresh_rate;
                                }
                                else {
                                  sideline.showDesktopNotifications = 1;
                            			sideline.searchRefreshRate = 1;
                                }

                                //call initialization callback
                                callback.call(sideline);
                              }
                            });
                		      }
                		    });
            		      }
            		    });
        		      }
        		    });
  		        },1000);
  		      }
  		    });
  		  }
  		});
	  },
	  //Canned SQL statements for use by the application
	  sql: {
	    createSearchGroups: "CREATE TABLE IF NOT EXISTS search_groups(id INTEGER PRIMARY KEY NOT NULL, group_name TEXT NOT NULL,active TEXT NOT NULL DEFAULT 'Y');",
	    createSearches: "CREATE TABLE IF NOT EXISTS searches(id INTEGER PRIMARY KEY NOT NULL, group_id INTEGER NOT NULL, search_title TEXT NOT NULL,actual_query_string TEXT,q TEXT,ands TEXT,ors TEXT,nots TEXT,phrase TEXT,tag TEXT,user_from TEXT,user_to TEXT,ref TEXT,pa TEXT,na TEXT,aq TEXT,twitter_starting_point INTEGER,active TEXT DEFAULT 'Y');",
      createTweets: "CREATE TABLE IF NOT EXISTS tweets(id INTEGER PRIMARY KEY NOT NULL,text TEXT,to_user_id INTEGER,from_user TEXT,twitter_id INTEGER,from_user_id INTEGER,profile_image_url TEXT,created_at TEXT,searches_id INTEGER,sideline_group_id INTEGER,loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
      createUserPreferences: "CREATE TABLE IF NOT EXISTS user_preferences(show_desktop_notifications INTEGER NOT NULL DEFAULT 1, refresh_rate INTEGER NOT NULL DEFAULT 1);",
      insertFavorites: "INSERT INTO searchGroups(group_name,active) VALUES ('Favorites', 'Y');"
	    getUserPreferences: "SELECT show_desktop_notifications, refresh_rate FROM user_preferences",
	    getAllSidelineGroups: "SELECT id, group_name FROM search_groups WHERE active='Y' ORDER BY id ASC",
	    getTweets: "SELECT id, text, from_user, twitter_id, profile_image_url, created_at, sideline_group_id, searches_id FROM tweets WHERE sideline_group_id = ? ORDER BY twitter_id DESC",
	    getGroupIdFromString: "SELECT id FROM search_groups WHERE group_name = ?"
	  }
	};
	
	//Create custom alert implementation
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
      buttons: [
        { 
          text: 'OK', 
          handler: function () {
            this.hide();
          }
        }
      ]
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
	
	//Initialize application
	(function() {
	  var sideline = new YAHOO.TI.Sideline();
	  YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineDB); //Add database functionality
		YAHOO.lang.augment(YAHOO.TI.Sideline, YAHOO.TI.SidelineUtil); //Add utility support as well
		
		//Initialize database - when DB is intialized, have sideline initialize its self
		sideline.db = openDatabase("ti_sideline","1.0", "Sideline", 200000);
		sideline.initializeSidelineDatabase(function() {
		  sideline.tabView = new YAHOO.widget.TabView();
      sideline.setupSidelineTabs();
		});
		
	})();
	
});