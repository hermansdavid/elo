/**
  tumblr uses tinymce editor (v???)

  we hack it a bit, inject our HTML directly 
  to the iframe

  the only 'trick' is setting the jQuery context to
  make elements on the correct document

  target: http://www.tumblr.com/new/text

*/
$(document.body).bind("drop", function(e) {
  var dt = e.originalEvent.dataTransfer;
  var _str = dt.getData("text/html");
  // this is clumsy, we want the tinymce iframe
  var base_doc = $("iframe#post_two_ifr").contents().get(0);
  $(base_doc.body, base_doc).append($(_str, base_doc));
});