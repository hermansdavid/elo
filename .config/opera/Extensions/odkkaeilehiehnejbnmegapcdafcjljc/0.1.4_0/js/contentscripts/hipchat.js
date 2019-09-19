
$("#message_input").bind("drop", function(e) {
  // console.log("I hear drop event", e);
  var dt = e.originalEvent.dataTransfer;
  var _str = dt.getData("text");
  $("#message_input").val($("#message_input").val() + _str)  
});
