//NOTE: This is not used at the moment
var Cc = Components.classes;
var Ci = Components.interfaces;

// Notification system for debugging
function AlertMessageService() {
  this.ALERT_IMG = "http://www.mozilla.com/favicon.ico";

  this.displayMessage = function(msg) {
    var text = msg;
    var title = "Debugging Notification";
    var icon = this.ALERT_IMG;

    if (typeof(msg) == "object") {
      text = msg.text;

      if (msg.title)
        title = msg.title;

      if (msg.icon)
        icon = msg.icon;
      // TODO: get the .exceptions options back in
    }

    try {
      var classObj = Components.classes["@mozilla.org/alerts-service;1"];
      var alertService = classObj.getService(Ci.nsIAlertsService);
      alertService.showAlertNotification(icon, title, text);
    } catch (e) {
      Components.utils.reportError(e);
    }
  };
}