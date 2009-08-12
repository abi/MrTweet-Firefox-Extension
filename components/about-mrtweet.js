Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

const Cc = Components.classes;
const Ci = Components.interfaces;

function MrtweetAboutHandler() {
}

MrtweetAboutHandler.prototype = {
    newChannel : function(aURI) {
        var ios = Cc["@mozilla.org/network/io-service;1"].
                  getService(Ci.nsIIOService);

        var channel = ios.newChannel(
          "chrome://mrtweet/content/mrtweet.html",
          null,
          null
        );

        channel.originalURI = aURI;
        return channel;
    },

    getURIFlags: function(aURI) {
        return Ci.nsIAboutModule.ALLOW_SCRIPT;
    },

    classDescription: "About MrTweet Page",
    classID: Components.ID("ce478fd7-ca7a-4641-9a2c-7312d246a1b0"),
    contractID: "@mozilla.org/network/protocol/about;1?what=mrtweet",
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule])
}

function NSGetModule(aCompMgr, aFileSpec) {
  return XPCOMUtils.generateModule([MrtweetAboutHandler]);
}