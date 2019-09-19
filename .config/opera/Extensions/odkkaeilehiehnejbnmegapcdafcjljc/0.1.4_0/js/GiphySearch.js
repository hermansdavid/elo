/***



    THIS IS SHARED CODE BASE

        it NEEDS TESTS!

    Implemented:
        mobile web
        chrome ext
        firefox ext
        safari ext


*/


var GiphySearch = {

    MAX_TAGS: 5,
    PLATFORM_COPY_PREPEND_TEXT:"",
    MAX_GIF_WIDTH: 145,
    SEARCH_PAGE_SIZE: 100,
    INFINITE_SCROLL_PX_OFFSET: 100,
    INFINITE_SCROLL_PAGE_SIZE: 50,
    ANIMATE_SCROLL_PX_OFFSET: 200,
    STILL_SCROLL_PAGES: 1,
    SCROLLTIMER_DELAY: 250,
    SCROLL_MOMENTUM_THRESHOLD: 100,
    ALLOW_URL_UPDATES:true, // enable history pushstate via add_history method
    API_KEY:"3rgXBKNKDmcA5Ykg9i",
    location:{}, // for chrome ext
    all_gifs:[],
    // navigation vars
    curPage: "gifs",

    // scrolling vars
    curScrollPos: 0,
    prevScrollPos: 0,
    isRendering: false,

    // event buffer timers
    scrollTimer: 0,
    searchTimer: 0,
    renderTimer: 0,
    // infinite scroll vars
    curGifsNum: 0, // for offset to API server
    curResponse: null,
    prevResponse: null,

    // search vars
    curSearchTerm: "",
    prevSearchTerm: "",


    init: function(data) {
        //console.log("init()");

        GiphySearch.init_extension();
        GiphySearch.bind_events();

    },
    bind_events:function() {


        $(window).on('popstate', function(event) {
            GiphySearch.handleBrowserNavigation.call(this,event);
        });

        // set the container height for scrolling
        // container.height($(window).height());
        var $container = $("#container");

        // watch scroll events for desktop
        $(window).on("scroll", function(event) {
            GiphySearch.scroll.call(this,event);
        });

        $container.on("click", ".tag", function(event) {
            GiphySearch.handleTag.call(this,event);
        }).on("click", ".giphy_box_li", function(event) {
            GiphySearch.handleGifDetail.call(this,event);
        }).on("dragstart", ".giphy_box_li", function(event) {
            GiphySearch.handleGIFDrag.call(this, event);
        }).on("click", "#categories .popular_tag", function(event) {
            GiphySearch.handleTag.call(this,event);
        });

        $(document.body).on("click", ".gif-detail-tag", function(event) {
            GiphySearch.handleTag(event);
        });
        // the gif-detail changed parents for rendering reasons
        $(document.body).on("dragstart",  "#gif-detail", function(event) {
            GiphySearch.handleGIFDrag.call(this, event);
        });
        //gif-detail

        // Sorry, this doesn't follow convention (GiphySearch.[function])!
        $(document.body).on("mouseenter", "#gif-detail-cover", function() {
            $(".gif-detail-hover-banner").addClass("gif-detail-hover-banner-active");
        });
        $(document.body).on("mouseleave", "#gif-detail-cover", function() {
            $(".gif-detail-hover-banner").removeClass("gif-detail-hover-banner-active");
        });

        $("#app").on("click", ".logo-text", function(event) {
            GiphySearch.handleTrendingHome.call(this,event);
        }).on("click", ".logo-image", function(event) {
            GiphySearch.handleTrendingHome.call(this,event);
        });
        // address 'home' via logo tag
        $("#header").on("click", function(event) {

        });

        // search input handler
        $("#searchbar-input").keypress(function(event) {
            if(event.keyCode == 13) {
                GiphySearch.handleSearch.call(this,event);
            }
        });

        // search button handler
        $("#search-button").on("click", function(event) {
            GiphySearch.handleSearch.call(this,event);
        });

        // categories handler
        $("#categories-button").on("click", function(event) {
            GiphySearch.handleCategories.call(this,event);
        });

        // back button handler
        $("#back-button").on("click", function(event) {
            GiphySearch.handleBack.call(this,event);
        });

    },
    is_ext:function() {
        return !!(window.chrome && chrome.contextMenus);
    },
    init_extension:function() {
        GiphySearch.PLATFORM_COPY_PREPEND_TEXT = "Copy to clipboard: "
        GiphySearch.ALLOW_URL_UPDATES = false;
        GiphySearch.STILL_SCROLL_PAGES = 3;

        // window.unonload = function() {
            // console.log("closed!")
            // chrome.contextMenus.removeAll();
        // }

        $(document.body).on("click", ".gif-detail-link-btn", function(event) {
            // copy to clipboard..
            var $this = $(this);
            var _input = newT.input({
                type:"text",
                id:"giphy_copy_box",
                value:$this.data("bitly_gif_url")
            });
            $("#giphy_copy_box").remove();
            $(document.body).append(_input);
            document.getElementById("giphy_copy_box").select();
            document.execCommand('Copy', false, null);

            // display user feedback (update button's text to say 'COPIED!')
            $this.text("COPIED!");
            $this.addClass("active");
            setTimeout(function() {
              $this.text("COPY LINK");
              $this.attr("class","gif-detail-link-btn");
            }, 1700)
        });
        var protocol_exp = /([https|http|ftp]+:)\/\//;
        var hostname_exp = /\/\/([^\/]+)\/?/;
        function urlparse(_url) {
          var params = {};

          var m1 = _url.match(protocol_exp);
          if(m1 && m1.length > 1) {
            params.scheme = m1[1];
          }

          var m2 = _url.match(hostname_exp);
          if(m2 && m2.length >1) {
            params.hostname = m2[1];
          }
          return params;
        }
        GiphySearch.render_completed = function() {
            // console.log("foo!");
            $("#searchbar-input").focus();
        }

        // load chrome!
        chrome.contextMenus.create({
          "documentUrlPatterns":["chrome-extension://*/*"],
          "id":"giphy_copy_context_menu",
          "title" : "Copy Link address",
          "type" : "normal",
          "contexts" : ["link"] //the context which item appear

        });

        chrome.contextMenus.create({
          "documentUrlPatterns":["chrome-extension://*/*"],
          "id":"giphy_img_src_menu",
          "title" : "Copy Full Size GIF Image",
          "type" : "normal",
          "contexts" : ["link"] //the context which item appear

        });
        chrome.windows.getCurrent(function(_win) {
          chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {

            if(_gaq) {
              _gaq.push(['_trackEvent', 'chromeext', 'open_popup']);
            }

            GiphySearch.location = urlparse(tabs[0].url);


          });

        });

        // setup the right click to work with links (not images due to drag issue)
        chrome.contextMenus.onClicked.addListener(function(info, tab) {
            // lookup the context
            // console.log("context menu!", info, info.srcUrl, GiphySearch.curResponse, GiphySearch.find_by_src(info.srcUrl));
            // TODO POSSIBLE ERROR here
            var gif_obj = GiphySearch.find_by_src(info.linkUrl);

          if(!gif_obj) {
            console.log("NO SUCH GIF!");
            // gif_obj = GiphySearch.curResponse.data[0];
            return;
            // return; // BAIL out
          }

          var elem_params = {
            type:"text",
            id:"giphy_copy_box",
            value:info.srcUrl
          };
          // console.log("info.menuItemId", info.menuItemId);
          if(info.menuItemId === "giphy_img_src_menu") {
            // console.log("Using", gif_obj.images.original.url);
            elem_params.value = gif_obj.images.original.url;
          } else if(info.menuItemId === "giphy_copy_context_menu") {
            // console.log("Using", gif_obj.bitly_gif_url);
            elem_params.value = gif_obj.bitly_gif_url;
          }
          var div = newT.input(elem_params);
          // $("#giphy_copy_box").val( elem_params.value ).select()
          // $("#giphy_copy_box").val( info.srcUrl );

          $("#giphy_copy_box").remove(); // kill existing
          $(document.body).append(div);
          document.getElementById("giphy_copy_box").select();
          document.execCommand('Copy', false, null);

          setTimeout(function() {
              if(_gaq) {
                _gaq.push(['_trackEvent', 'chromeext', 'right_click', gif_obj.id ]);
              }
          },0);

        });
    },
    find_by_id:function(gif_id) {
        var all_gifs = GiphySearch.all_gifs;
        var selected = null;
        // if(GiphySearch.prevResponse) {
        //     all_gifs.push.apply(all_gifs,GiphySearch.prevResponse.data);
        // }

        // if(GiphySearch.curResponse) {
        //     all_gifs.push.apply(all_gifs,GiphySearch.curResponse.data);
        // }

        // var data = GiphySearch.curResponse;
        for(var i=0, len=all_gifs.length; i<len; i++) {
            if(all_gifs[i].id === gif_id) {
                selected = all_gifs[i];
                break;
            }
        }
        all_gifs = [];
        return selected;
    },
    find_by_src:function(src_url) {
        var all_gifs = [];
        var selected = null;
        if(GiphySearch.prevResponse) {
            all_gifs.push.apply(all_gifs,GiphySearch.prevResponse.data);
        }

        if(GiphySearch.curResponse) {
            all_gifs.push.apply(all_gifs,GiphySearch.curResponse.data);
        }

        // var data = GiphySearch.curResponse;
        for(var i=0, len=all_gifs.length; i<len; i++) {
            if(all_gifs[i].images.fixed_width.url === src_url) {
                selected = all_gifs[i];
                break;
            }
        }
        all_gifs = [];
        return selected;
    },
    /**
        requires:
            src url
            element frag, tags
            element frag, links

    */
    drawGIFDetail:function(gif_obj, img, tags) {
        var tagfrag = newT.frag();

        for(var i=0;i<tags.length; i++) {
            tagfrag.appendChild(newT.span({
                clss:"gif-detail-tag hashtag"
            },
            tags[i]));
        }
        //var copy_str = GiphySearch.PLATFORM_COPY_PREPEND_TEXT+""+ gif_obj.bitly_gif_url;
        var frag = newT.div({
                id:"gif-detail"
            },
            newT.div({
                id:"gif-detail-gif-wrapper"
            },
                img,
                newT.div({
                  clss:"banner gif-detail-hover-banner",
                }, newT.span({clss:"bold"},"CLICK+DRAG"),
                " IMAGE TO EMBED ANYWHERE")
            ),
            newT.div({
                id:"share-menu"
            },
            newT.div({
                id:"gif-detail-tags"
            }, tagfrag),
            newT.div({
                id:"gif-detail-link-wrapper"
            },
              newT.div({
                  id:"gif-detail-link"
              },
                  newT.div({
                      id:"gif-detail-link-text"
                  }, gif_obj.bitly_gif_url),
                  newT.div({
                      clss:"gif-detail-link-btn",
                      "data-bitly_gif_url":gif_obj.bitly_gif_url
                  }, "COPY LINK"))
              )
            ),
            newT.a({
                id:"gif-detail-cover",
                href:gif_obj.images.fixed_width.url
            }));
        return frag;
    },
    renderGIFDetail:function( data ) {

        $("#gif-detail").remove();
        var gif_obj = GiphySearch.find_by_id( data.gif_id );


        var img = new Image();
        img.src = gif_obj.images.fixed_width.url;
        img.id = "gif-detail-gif";
        img.onload = function() {
            //console.log("loaded image", data, img);
            GiphySearch.hide_preloader();
            $("#gif-detail-cover").css({
                height:Math.min($("#gif-detail-gif").height(), 410)
            });
        }

        var frag = GiphySearch.drawGIFDetail( gif_obj, img, data.tags );
        $("#container").before( frag );
    },
    format:function(str,params) {
        return str.replace(/%\((\w+)\)s/g, function(m, key) {
            return params[key] || ""
        });
    },

    /**
        Handlers definitions
            handle all the events

            this is a hodge-podge
            some of the events call sub methods, others
            are defined top level
    */
    handleGIFDrag:function(e) {
        // console.log("I am dragging!", e);
        var dt = e.originalEvent.dataTransfer;
        var $this = $(this).find("img");
        // var _id = $this.data("id");
        var _hostname = GiphySearch.location.hostname;
        var gif_obj = GiphySearch.find_by_src( $this.attr("src") );
        // console.log("found gif!", gif_obj);
        if(!gif_obj) {
            console.log("no such GIF", gif_obj);
            return;
        }
        dt.dropEffect = "copy";
        dt.effectAllowed = "copy";
        var htmlstr = GiphySearch.gmail_template( {
            src:gif_obj.images.original.url,
            url:gif_obj.bitly_gif_url
        });
        dt.setData("text/html", htmlstr);
        dt.setData("text", htmlstr);

        if(_hostname === "twitter.com") {
            dt.setData("text/html", gif_obj.bitly_gif_url + " via @giphy"  );
        }
        if(_hostname === "www.facebook.com") {
            dt.effectAllowed = "linkMove";
            dt.dropEffect = "linkMove";
            // FB pukes on our short link. use full url for better user experience
            dt.setData("text/html", "http://giphy.com/gifs/" + gif_obj.id  );
            dt.setData("text", "http://giphy.com/gifs/" + gif_obj.id  );
        }
        if(/.*\.hipchat\.com/.test(_hostname)) {
            dt.setData("text/html", gif_obj.images.original.url);
            dt.setData("text", gif_obj.images.original.url);
        }
    },

    handleSearch: function(event) {
        //console.log("handleSearch()");

        // get the tag to search
        var tag = $("#searchbar-input").val();
        if(tag == "") return;

        // don't reset the typed in input!
        GiphySearch.scrollTimer = 0;
        GiphySearch.searchTimer = 0;
        GiphySearch.curY = 0;
        GiphySearch.curOffset = 0;
        // reset the scroll and page vars
        // GiphySearch.resetSearch();

        // make the new search
        GiphySearch.show_preloader();
        GiphySearch.search(tag, GiphySearch.SEARCH_PAGE_SIZE, true);
        GiphySearch.navigate("gifs");
    },
    handleTrendingHome:function(event) {
        GiphySearch.show_preloader();
        GiphySearch.resetSearch();
        GiphySearch.search("giphytrending", 100, true);
        GiphySearch.navigate("gifs");
        $("#banner-wrapper").show();
        // GiphySearch.add_history( "Giphy", "/" );
    },
    handleTag: function(event) {
        //console.log("handleTag()");

        // get the tag
        var tag = $(event.target).text().replace("#","");
        if(tag == '') return;

        GiphySearch.show_preloader();
        GiphySearch.resetViewport();
        GiphySearch.updateSearch( tag );

        // reset the scroll and page vars
        // GiphySearch.resetSearch();

        // make the new search
        GiphySearch.search(tag, GiphySearch.SEARCH_PAGE_SIZE, true);
        GiphySearch.navigate("gifs");
        // isolate all these,
        // restrict to a flag
        // GiphySearch.add_history( "Giphy Gif Search", "/search/" + tag.replace(/\s+/g, '-') );

    },

    handleGifDetail: function(event) {
        //console.log("handleGifDetail()", $(event.target), $(event.target).find("img"));

        // get the fullsize gif src
        var gif = $(event.target).parent(".giphy_box_li").find("img");
        var gifEl = $("#gif-detail-gif");
        // var loader = $("#loader");
        var animatedLink = gif.attr("data-animated");
        var staticLink =  gif.attr("data-still");

        gifEl.attr("src", staticLink);

        // show the loader
        // loader.css("display","block");
        GiphySearch.show_preloader();

        // $("#gif-detail-gif").load(function(){
        //     $("#gif-detail-gif").unbind();
        //     GiphySearch.hide_preloader();
        //     // loader.css("display","none");
        //     gifEl.attr("src", animatedLink);
        //     $(".gif-detail-cover").css({
        //        height:$("#gif-detail-gif").height()
        //     });
        // }).attr("src", animatedLink);

        // Split tags into array of tags
        var splitted = gif.attr("data-tags").split('%');

        var data = {
            gif_id:gif.attr("data-id"),
            tags:splitted
        };

        // handle the back button specifically
        $("#back-button").show();
        $("#footer").hide();
        GiphySearch.renderGIFDetail(data);



        // var linkHTML = "<a href='"+ gif.attr("data-shortlink")+"'>" + GiphySearch.PLATFORM_COPY_PREPEND_TEXT+""+ gif.attr("data-shortlink")+"</a>";
        // var tags = gif.attr("data-tags").split(',');
        // var tagsHTML = "";
        // $(tags).each(function(idx, tag){
        //     if(tag !== ""){
        //         tagsHTML += "<span class='gif-detail-tag'>"+tag+"</span>"; //USE ACTUAL ENCODDed?
        //     }
        // });

        // $("#gif-detail-link").html(linkHTML).attr({
        //     "data-shortlink":gif.attr("data-shortlink") // we should call this data the same name as the server does
        // });
        // $("#gif-detail-tags").html(tagsHTML);



        // $(".gif-detail-cover").css({
        //    height:$("#gif-detail-gif").height()
        // }).attr("draggable", true).attr("href", $("#gif-detail-gif").attr("src"));

        // // GiphySearch.add_history( "Giphy", "/gifs/"+gif.attr("data-id") );
        // GiphySearch.navigate("gif-detail");
    },

    handleCategories: function(event) {
        //console.log("handleCategories()");
        event.preventDefault();

        // [JACK] Added toggle for category drawer button
        if (GiphySearch.curPage != "gifs") {
          GiphySearch.navigate("gifs");
        } else {
          GiphySearch.navigate("categories");
        }

    },


    handleBrowserNavigation: function(event){
        /*
         * UPDATE SO TO NOT MAKE NEW SEARCH CALLS WHen
         */
        var pathHash = window.location.pathname.split('/');
        if(pathHash[1] != "") {
            if(pathHash[1] == "gifs"){
                GiphySearch.navigate("gif-detail", pathHash[2]);
            }
            if(pathHash[1] == "search"){
                GiphySearch.search(pathHash[2], 100, true);
                GiphySearch.navigate("gifs");
            }
        } else {
            GiphySearch.search("giphytrending", 100, true);
            GiphySearch.navigate("gifs");
        }
    },
    handleBack:function(event) {

        $("#categories,#back-button").hide();
        $("#footer").show();
        $("#gif-detail").remove();
        GiphySearch.navigate("gifs");
    },
    // handleCategoryBack: function(event) {
    //     //console.log("handleBack()");

    //     // no back on the gifs page
    //     if(GiphySearch.curPage == "gifs") { return; }

    //     // back to the gif page
    //     if(GiphySearch.curPage == "categories" ||
    //         GiphySearch.curPage == "gif-detail") {
    //         // GiphySearch.add_history("Giphy", "/");

    //         GiphySearch.navigate("gifs");
    //     }
    // },

    navigate: function(page, data) {
        //console.log("navigate(" + page + "," + data + ")");

        // set the current page
        GiphySearch.curPage = page;

        // hide everything
        $("#banner-wrapper,#gifs,#gif-detail,#share-menu,#categories,#category,#back-button").hide();
        // show the footer... it goes away on the gif-detail
        $("#footer").show();

        // gifs
        if(page == "gifs") {
            $("#gifs").show();
        }

        // gif detail
        if(page == "gif-detail") {
            $("#gif-detail,#back-button,#share-menu").show();
            $("#footer").hide();
        }

        // categories
        if(page == "categories") {
            $("#categories,#back-button").show();
        }

        // category
        if(page == "category") {
            $("#category").show();
        }
    },


    orientationchange: function(event) {
        //console.log("orientationchange()");
    },

    scroll: function(event) {

        // only scroll on gifs page
        if(GiphySearch.curPage != "gifs") return;

        // set the current scroll pos
        GiphySearch.prevScrollPos = GiphySearch.curScrollPos;
        GiphySearch.curScrollPos = $(event.target).scrollTop() + $(window).height();

        // infinite scroll
        if(GiphySearch.curScrollPos + GiphySearch.INFINITE_SCROLL_PX_OFFSET > $("#gifs").height()) {

            // start the infinite scroll after the last scroll event
            clearTimeout(GiphySearch.searchTimer);
            GiphySearch.searchTimer = setTimeout(function(event) {
                GiphySearch.search(GiphySearch.curSearchTerm, GiphySearch.INFINITE_SCROLL_PAGE_SIZE, false);
            }, 250);
        }

        // compenstate for a double scroll end event being triggered
        clearTimeout(GiphySearch.scrollTimer);
        GiphySearch.scrollTimer = setTimeout(function() {
            GiphySearch.scrollend(event);
        }, GiphySearch.SCROLLTIMER_DELAY);
    },

    scrollstart: function(event) {
        //console.log("scrollstart()");
    },

    scrollend: function(event) {

        if(GiphySearch.renderTimer) { clearTimeout(GiphySearch.renderTimer); }
        GiphySearch.renderTimer = setTimeout(function() {
            GiphySearch.render();
        }, 250);
    },
    hide_preloader:function() {

        $(".loading_icon_box,.loading_icon").css("display","none");
    },
    show_preloader:function() {
        $(".loading_icon_box,.loading_icon").css("display","block");
    },
    // THIS IS POORLY NAMED, it doesn't render, it displays..
    // renders (aka added to DOM happens WAY earlier)
    render: function() {


        if(GiphySearch.isRendering) return;
        GiphySearch.isRendering = true;


        //console.log("*** render() ***");
        //console.log("*** display() ***");

        // get all the gifs
        /**
            NOTE:
                lis ONLY has a length
                when there are ALREADY rendered items
                on the page

                this is related to using setTimeout
                when adding images to masonry / DOM


        */
        var lis = $("#gifs li");
        // calculate the window boundaries
        var windowTop = $(window).scrollTop();
        var windowBottom = windowTop + $(window).height();
        var windowHeight = $(window).height();

        // sliding window of animated, still, and off
        for(var i=0; i<lis.length; i++) {

            // get the gif

            var li = $(lis.get(i));

            // try cooperative multitasking to let the graphics render have a moment
            // this seems super innefficient b/c we access the DOM a LOT
            (function($li, _pos) {
                setTimeout(function() {

                // need to calculate the window offsets and some emperical padding numbers
                var liTop = $li.offset().top;
                var liBottom = liTop + $li.height();
                var img = $li.find("img");
                var liHeightOffset = GiphySearch.ANIMATE_SCROLL_PX_OFFSET;
                var stillPagesOffset = GiphySearch.STILL_SCROLL_PAGES;

                // turn on the gifs that are in view... we pad with an offset to get the edge gifs
                if((liTop >= windowTop - liHeightOffset) && (liBottom <= windowBottom + liHeightOffset)) {
                // if((liTop >= windowTop - liHeightOffset) && (liBottom <= windowBottom + liHeightOffset)) {
                    //console.log("GIF ON");

                    // buffer the animated gifs with a page above and below of stills...
                    // pad these a big with multiples of the window height
                    $(img).attr("src", $(img).attr("data-animated"));
                    // $(img).attr("src", $img.attr("data-downsampled"));

                } else if((liTop >= windowTop - windowHeight*stillPagesOffset) &&
                          (liBottom <= windowBottom + windowHeight*stillPagesOffset)) {
                    //console.log("GIF STILL");

                    // still these gifs
                    $(img).attr("src", $(img).attr("data-still"));

                } else {
                    //console.log("GIF OFF");

                    // clear the rest of the gifs

                    if(GiphySearch.is_ext()) {
                        $(img).attr("src", $(img).attr("data-still") );
                    } else {
                        $(img).attr("src", "/img/clear.gif");
                    }

                }

                if(lis.length-1 === _pos) {
                    GiphySearch.render_completed();
                    // console.log(i, "current possition",  lis.length)
                }
            }, 0)})( $(li), i  );

        }

        // reset rendering
        GiphySearch.isRendering = false;
        GiphySearch.hide_preloader();
        //console.log("rendering completed", "is rendering", GiphySearch.isRendering, lis.length);
    },
    gmail_template:function(params) {
        // we paste this 'template' into the dragdrop datatranser object
        return GiphySearch.format( '<a href="%(url)s"><img src="%(src)s" border="0" /></a><br />via <a href="%(url)s">giphy.com</a>', params );
    },
    render_completed:function() {
        //console.log("done rendering now!");

    },
    updateSearch:function(txt) {
        $("#searchbar-input").val(txt);
    },
    resetViewport:function() {
        GiphySearch.scrollTimer = 0;
        GiphySearch.searchTimer = 0;
        GiphySearch.curY = 0;
        GiphySearch.curOffset = 0;

    },
    resetSearch: function() {
        //console.log("resetSearch()");

        // reset the search box
        // $("#searchbar-input").blur();
        $("#searchbar-input").val("");
        // reset the scroll params
        GiphySearch.resetViewport();
    },
    process_search_response:function(response) {
        //console.log("fetched API data", response)
        // set the current search term
        // parse the gifs
        var gifs = response.data;
        var elem_array = [];
        var _frag = document.createDocumentFragment();
        for(var i=0; i<gifs.length; i++) {

            var gif = gifs[i];
            var tags = gif.tags || [];
            var gifTags = newT.frag();
            var _dataTags = [];
            // TODO: make this a function
            if(tags) {
                for(var j=0; j<tags.length && j<GiphySearch.MAX_TAGS; j++) {
                    if(tags[j].indexOf('giphy') == -1){
                        gifTags.appendChild(newT.span({
                            clss:"tag"
                        }, newT.span({
                            clss:"hashtag"
                        }, "#"), tags[j]));
                        _dataTags.push( tags[j] );
                    }
                }
            }
            var dataTags = _dataTags.join("%");
            // console.log(gifTags);
            var _gif_height = Math.floor((gif.images.fixed_width.height * GiphySearch.MAX_GIF_WIDTH / gif.images.fixed_width.width));
            var imgFrag = newT.img({
                          clss:"gif giphy_gif",
                          height:_gif_height,
                          "data-id":gif.id,
                          "data-animated":gif.images.fixed_width.url,
                          "data-downsampled":gif.images.fixed_height_downsampled.url,
                          "data-still":gif.images.fixed_width_still.url,
                          "data-tags":dataTags,
                          "data-shortlink":gif.bitly_gif_url,
                          src:"/img/clear.gif"

                      });
            var tagFrag = newT.span({ clss:"caption tags" }, gifTags);
            var _li = newT.li({
                        clss:"giphy_box_li",
                        draggable:true
                    },
                    // ugh, fix all these fucking names
                    // should be SAME as API response, not invented
                    newT.div({
                      clss: "hoverable-gif"
                    }, imgFrag, tagFrag
                    ),
                    newT.div({
                        clss:"actions"
                    },newT.a({
                        href:"#"
                    })),
                    newT.a({
                        href:gif.images.fixed_width.url,
                        style:"height:" + _gif_height + "px;",
                        clss:"gif_drag_cover"
                    })
                )

            _frag.appendChild(_li);
            elem_array.push(_li)
            // increment the num gifs
            GiphySearch.curGifsNum++; // why? really seriously why?


        }
        // when I call settimout, the page no longer loads - WHY? no lis..
        document.getElementById("gifs").appendChild(_frag);
        $("#gifs").masonry('appended', elem_array, true);



    },
    search: function(q, limit, reset) {
        $(".gif_error_msg").remove();
        // if we are searching, bail on scroll
        // are we a new search vs infinite scroll then reset the gif count
        if(reset) {
            GiphySearch.curGifsNum = 0;
            $('#gifs').empty();
        }
        GiphySearch.show_preloader();

        // save the current and previous search terms
        GiphySearch.prevSearchTerm = GiphySearch.curSearchTerm;
        GiphySearch.curSearchTerm = q;

        // giphy search api url
        var url = "http://api.giphy.com/v1/gifs/search?api_key=" + GiphySearch.API_KEY +
            "&q=" + q +
            //"&type=min" +
            "&limit=" + limit +
            "&offset=" + GiphySearch.curGifsNum;

        // make the ajax call
        var xhr = $.ajax({
            dataType: "json",
            url: url
        });
        xhr.done(function(resp) {
            // skip prev responses



            if(GiphySearch.curResponse == resp) { return; }
            GiphySearch.curSearchTerm = q;
            GiphySearch.curLimit = limit;
            // set the previous response to keep out old data
            GiphySearch.prevResponse = GiphySearch.curResponse;
            GiphySearch.curResponse = resp;

            if(resp.data && resp.data.length > 0) {
                [].push.apply(GiphySearch.all_gifs,resp.data);
            }


            // if this is reset then swap ou
            if(reset) {

                $("#gifs").empty();
                $("#gifs").masonry();


            }

            if(resp.data.length<=0) {
                //console.log("no results");
                $("#container").append(newT.div({clss:"gif_error_msg"},"Sorry, we couldn't find any GIFs for that term"))
                // return;
            }
            //console.log("resp.data.length", resp.data.length);

            setTimeout(function() {
                GiphySearch.process_search_response(resp);
                GiphySearch.render();
            },0)

        }).fail(function(resp) {
            //console.log("FAILED!! resp", resp);
            GiphySearch.hide_preloader();
            $("#gifs").empty().append(newT.div({clss:"gif_error_msg"},"Oops, we detected an error fetching GIFs!"))
        });
        return xhr;
        // xhr.
    },
    animateHoverGuide: function() {
      // Insert banner into DOM
      // Animate it up
      //$("#gif-detail-gif-wrapper")
    }
}
