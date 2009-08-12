(function() {
  
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  
  const MRTWEET_ID = "mrtweet@mrtweet.com";
  const MRTWEET_URL = "about:mrtweet";
  
  const VERSION_PREF ="extensions.mrtweet.version";
  const ACTIVATED_PREF = "extensions.mrtweet.activated";

  
  //When the user first installs the extension, we show the about:mrtweet page
  var currVersion = Application.prefs.getValue(VERSION_PREF, "firstrun");
  var realVersion = Application.extensions.get(MRTWEET_ID).version;

  if (currVersion != realVersion) {
    Application.prefs.setValue(VERSION_PREF, realVersion);
    if(currVersion == "firstrun"){
      //NOTE: For some reason, FUEL doesn't work here, presumably because Firefox's just starting up
      //Application.activeWindow.open(MrTweetExt.url(MRTWEET_URL)).focus();
      window.addEventListener(
        "load",
        function onWindowLoad() {
          window.removeEventListener("load", onWindowLoad, false);
          var tabbrowser = window.getBrowser();
          tabbrowser.addEventListener(
            "load",
            function onBrowserLoad() {
              tabbrowser.removeEventListener("load", onBrowserLoad, false);
              var tab = tabbrowser.addTab(MRTWEET_URL);
              tabbrowser.selectedTab = tab;
            },
            false
          );
        },
        false
      );
    }
  }
    
  var MrTweetExt = {
    // Utility function to convert URL strings to nsURI
    url : function url(spec) {
      var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      return ios.newURI(spec, null, null);
    },
    openMrTweetWebsite : function openMrTweetWebsite(){
      var activated = Application.prefs.getValue(ACTIVATED_PREF, false);
      if(activated){
        Application.activeWindow.open(this.url('http://www.mrtweet.com')).focus(); 
      }else{
        Application.activeWindow.open(this.url(MRTWEET_URL)).focus(); 
      }
    },
    _appendToFile: function _appendToFile(file, data){
      var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                     .createInstance(Ci.nsIFileOutputStream);
      foStream.init(file, 0x02 | 0x10, 0666, 0);
      foStream.write(data, data.length);
      foStream.close();
    },
    logToFile: function logToFile(data){
      var nativeJSON = Cc["@mozilla.org/dom/json;1"]
                       .createInstance(Ci.nsIJSON);
      var em = Cc["@mozilla.org/extensions/manager;1"]
                       .getService(Ci.nsIExtensionManager);
      var file = em.getInstallLocation(MRTWEET_ID)
                  .getItemFile(MRTWEET_ID, "content/logs/log.txt");  
      this._appendToFile(file, nativeJSON.encode(data) + "\n\n");
    },
    showNoDataMsg: function showNoDataMsg(doc){
      $(doc).find("#mrtweet-stats").empty().append("No MrTweet data available yet. Working on it!");
    }
  }
  
  function JSONify(obj){
    var nativeJSON = Cc["@mozilla.org/dom/json;1"]
                     .createInstance(Ci.nsIJSON);
    return nativeJSON.decode(obj);
  }
        
  function onPageLoad(aEvent){
    var doc = aEvent.originalTarget;
    var url = doc.location.href;
    //Check if the page *might* Twitter
    if(url.indexOf("twitter.com") != -1){
      //Get the username of the profile you are looking at
      var cur_user = $.trim($(doc).find("h2.thumb").text());
      //It might be the /home page 
      //where the username is stored in a different place
      if(!cur_user){
        cur_user = $.trim($(doc).find("#me_name").text());
        //If there's no username still, return (might be a settings page, etc.)
        if(!cur_user){
          return;
        }
      }
      
      try{
        
        var newDiv = doc.createElement("div");
        var html_str = "<div style='padding-left:14px'>" + 
                      "<p style='font-size:1.1em;font-weight:bold;background-image:url(resource://mrtweet/content/images/icon.png); background-repeat: no-repeat; padding-left: 20px; background-position: 0px 5px;'>MrTweet Statistics</p>" + 
                      "<div id='mrtweet-stats' style='padding-bottom: 16px; width: 170px; padding-top: 8px; font-size:1.1em'>";
        
        var activated = Application.prefs.getValue(ACTIVATED_PREF, false);
        if(activated){
          html_str +=  "Loading…</div></div>";
          newDiv.innerHTML = html_str;
          $(doc).find("#primary_nav").before(newDiv);
        }else{
          html_str +=  "Please login on the about:mrtweet page to start seeing stats.</div></div>";
          newDiv.innerHTML = html_str;
          $(doc).find("#primary_nav").before(newDiv);
          return;
        }

        $.ajax({
          type: "GET",
          url: "http://api.mrtweet.com/v1/profile/"+ cur_user + "/bc973dc90bb020f46123278c7fe16c9df206bd95.json",
          success: function(data){
            data = JSONify(data);           
            try{
              MrTweetExt.logToFile({"user": cur_user, "data" : data});
            }catch(e){
              //do nothing
            }
            
            if(data.status != "success"){
              MrTweetExt.showNoDataMsg(doc);
              return;
            }
            
            function mapIntervalsToDesc(intervals, descriptors, tips, value){
              for(var i=0;i<descriptors.length;i++){
                if(value >= intervals[i] & value < intervals[i+1]){
                  return [descriptors[i], tips[i]];
                }
              }
            }
            
            var conversation_ratio = data.profile.conversation ? data.profile.conversation : false;
            var link_ratio = data.profile.links ? data.profile.links : false;
            var num_recs = data.profile.recommendations;
            var freq = data.profile.frequency ? data.profile.frequency.toFixed(2) : false;
            
            var statsData = {"stats" : [], "cur_user" : cur_user};
            //Process all the data, add descriptors, tooltips, etc.
            if(freq){
              
              var comp_freq = Math.ceil(freq/2.53);
              var freq_desc = "(" + comp_freq + "X more than Twitter founders)";
              
              if(freq >= 2.53 && freq < 4){
                freq_desc = "(tweets as much as the Twitter founders)";
              }
              
              if(freq < 2.53){
                freq_desc = "";
              }
              
              var freq_tooltip = "";
              
              if(conversation_ratio){
               freq_tooltip = Math.round(conversation_ratio * 100) + "% of her/his tweets are @replies"; 
              }
              
              statsData.stats.push({"num" : freq,
                                    "text" : "tweets/day " + freq_desc,
                                    "tooltip" :  freq_tooltip});
            }
            
            if(conversation_ratio){
              var conversation_desc = mapIntervalsToDesc(
                                        [0, 0.01, 0.15, 0.31, 0.63, 2],
                                        ["(way below average)", "(below average)", "(average)", "(above average)", "(way above average)"],
                                        ["Soliloquist", "Contemplative", "Conversational", "Engaging", "Very engaging"],
                                        conversation_ratio
                                      );
              //num, text, tooltip
              statsData.stats.push({"num" : Math.round(conversation_ratio * 100) + "%",
                                    "text" :  "conversations " + conversation_desc[0],
                                    "tooltip" :  conversation_desc[1]});
            }

            if(link_ratio){
              var link_desc = mapIntervalsToDesc(
                                [0, 0.01, 0.15, 0.51, 2],
                                ["(below average)", "(average)", "(above average)", "(way above average)"],
                                ["Non linker", "Links selectively", "Good connector", "Hyperlinked"],
                                link_ratio
                              );
                              
              statsData.stats.push({"num" : Math.round(link_ratio * 100) + "%",
                                    "text" :  "links " + link_desc[0],
                                    "tooltip" :  link_desc[1]});
            }

            
            if(num_recs >= 0){
              
              var rec_desc = (num_recs == 1) ? "recommendation" : "recommendations";
              var rec_tooltip = "View all recommendations at mrtweet.com";
              statsData.stats.push({"num" : num_recs,
                                    "text" : rec_desc,
                                    "tooltip" :  rec_tooltip});
            }
            
            var tplStr = ("<ul>{for stat in stats}" +
                            "<li style='padding-bottom:5px'>" +
                            "<a href='http://mrtweet.com/${cur_user}' target='_blank' title='${stat.tooltip}'>" + 
                            "<span class='stats_count'>${stat.num}</span> <span class='label'>${stat.text}</span></a></li>" +
                          "{/for}</ul>").process(statsData);
            
            newDiv = doc.createElement("div");
            newDiv.innerHTML = tplStr;
                        
            if(statsData.stats.length == 0){
              MrTweetExt.showNoDataMsg(doc);
              return;
            }
            //Get recommendations, if any
            if(num_recs > 0){
              
              newDiv.innerHTML += "<div id='mrtweet-rec' style='padding-top:0px'>Loading recommendation…</div>";
              
              $.ajax({
                type: "GET",
                url: "http://api.mrtweet.com/v1/recommendations/" + cur_user + "/bc973dc90bb020f46123278c7fe16c9df206bd95.json",
                success: function(data2){
                  data2 = JSONify(data2);
                  if(data2.status != "success"){
                    $(doc).find("#mrtweet-rec").empty();
                  }else{
                    $(doc).find("#mrtweet-rec").empty().append(
                      "<p style='font-size:0.9em; padding-bottom:0px'>@" + 
                      data2.recommendations[0]["name"] + " recommends: </p><p style='padding-bottom:5px;padding-top:5px;font-size:1.1em'>" +
                      data2.recommendations[0]["text"] + 
                      "</p><p style='padding-top:0px'><a href='http://mrtweet.com/" + cur_user +
                      "' target='_blank' style='font-size:0.9em'>view all recommendations</a></p>");
                  }
                },
                error: function(data){
                  data = JSONify(data);
                  $(doc).find("#mrtweet-rec").empty();
                }
              });
              
            }
            
            $(doc).find("#mrtweet-stats").empty().append(newDiv);
          },
          error : function(data){
            data = JSONify(data);
            MrTweetExt.showNoDataMsg(doc);
          }
        });
      }catch(e){
        //Do nothing
      }
    }
  }
  
  window.mrTweetExt = MrTweetExt;
  window.document.getElementById("appcontent").addEventListener("DOMContentLoaded", onPageLoad, true);
  
  
})();
