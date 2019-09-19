

// handle the drop event correctly
$(document.body).bind("drop", function(e) {
  // console.log("github got a drop event", e);
  var $this = $(e.target);
  var dt = e.originalEvent.dataTransfer;
  $this.val($this.val() + dt.getData("text"));
});