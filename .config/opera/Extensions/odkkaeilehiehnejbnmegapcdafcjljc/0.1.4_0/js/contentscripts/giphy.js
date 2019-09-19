// remove promo is there, add notice ext is installed to dom
$(".chrome_promo").remove();
$(document.body).append($('<div class="chrome_ext_installed"></div>'));