console.log("I am disqus");


$(document.body).bind("drop", function(e) {
  var dt = e.originalEvent.dataTransfer;
  var _str = dt.getData("text/html");
  console.log("I am the drop");
  // this is clumsy, we want the tinymce iframe
  // var base_doc = $("iframe#post_two_ifr").contents().get(0);
  // $(base_doc.body, base_doc).append($(_str, base_doc));
});