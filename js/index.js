
//  https://www.talater.com/annyang/

/** 
Fullscreen mode on click on screen
**/
addEventListener("click", function() {
    var el = document.documentElement,
      rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen 
    ;

    rfs.call(el);

});

/**
DB
**/
var db = new PouchDB('pages');
var imageDb = new PouchDB('images');


if (annyang) {
  console.log('start');
  var currentMonolog, currentImages;
  var wikipedia = function(word) {
    var url = '//sv.wikipedia.org/w/api.php?action=query&redirects=1&prop=images%7Cextracts&format=json&callback=?&exintro=&titles='+word;
    $.ajax({
        type: "GET",
        url: url,
        contentType: "application/json; charset=utf-8",
        async: false,
        dataType: "json",
        success: function (data, textStatus, jqXHR) {
            console.log(data);
            if (data.query && data.query.pages) {
              currentMonolog = [];
              var result = data.query.pages;
              if (result[-1] == undefined) {
                var page = result[Object.keys(result)[0]],
                  markup = page.extract;
                  blurb = $('<div></div>').html(markup).text();
                  console.log(page);
                fetchWikiImages(page);
                savePage(page);
                currentMonolog = blurb.split('.');
                currentMonolog.unshift(word);
                tellMore(4);
              } else {
                snacka('Jag vet tyvärr inget om ' + word);
              }

            }
        },
        error: function (errorMessage) {
          snacka('Jag vet tyvärr inget om det');
        }
    });
  };

  var fetchWikiImages = function(page) {
    $('#slides').html('');
    $('#container').removeClass('slides-playing');
    if (page['images']) {
      for (var i = 0, len = page['images'].length; i < len; i++) {
        var image = page['images'][i],
          title = image['title'],
          imageUrlQuery;
        if(title != 'Fil:Commons-logo.svg' 
          && title != 'Fil:P vip.svg') {
            title = title.replace('Fil:', '').replace(' ', '_');
            imageUrlQuery = "//sv.wikipedia.org/w/api.php?action=query&titles=Bild:" + title + "&prop=imageinfo&iiprop=url&format=json&callback=?";
            $.ajax({
              type: "GET",
              url: imageUrlQuery,
              contentType: "application/json; charset=utf-8",
              async: false,
              dataType: "json",
              success: function (data, textStatus, jqXHR) {
                var result = data.query.pages,
                  page = result[Object.keys(result)[0]],
                  url = page['imageinfo'][0]['url'];
                  saveImage(page);
                  addSlide(url);
                  console.log(page);

              },
              error: function (errorMessage) {}
            });
        }
      }
    }
  }

  var getBestImageUrl = function(page) {
    if (page['images']) {
      var image = page['images'][i],
        title = image['title'],
        imageDoc;

        imageDoc = imagedb.get(title)
          .catch(function (err) {
            console.log(err);
          });

        return imageDoc['imageinfo'][0]['url'];
    }
  }

  var savePage = function(page) {
    page._timestamp = + new Date();
    db.putIfNotExists(page.pageid, page)
      .catch(function (err) {
        console.log(err);
      });
  }

  var saveImage = function(page) {
    imageDb.putIfNotExists(page.title, page)
      .catch(function (err) {
        console.log(err);
      });
  }

  var slides,
   currentSlide,
  slideInterval;

  var addSlide = function(image) {
    $('#container').addClass('slides-playing');
    $('#slides').append('<li class="slide"><img src="' + image + '"></li>').on('click', 
      function(){ $('#container').removeClass('slides-playing'); });
    slides = document.querySelectorAll('#slides .slide');
    currentSlide = 0;
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide,2000);

    function nextSlide() {
        slides[currentSlide].className = 'slide';
        currentSlide = (currentSlide+1)%slides.length;
        slides[currentSlide].className = 'slide showing';
    }
  };

  var hello = function() {
      snacka('Hej! Vad heter du?');
      annyang.addCommands({
        '(Jag heter) *name': yourName
      });
  };

  var yourName = function(name) {
      snacka('Hej ' + name + ', trevligt att träffas');
      annyang.removeCommands('(Jag heter) *name');
  };

  var tellMore = function(num) {
    var text = '',
      isMore = false;

    if (currentMonolog.length) {
      if (!num) {
        text = currentMonolog.join('.');
        currentMonolog = [];
      } else {
        if (currentMonolog.length < num) {
          num = currentMonolog.length;
        }
        for (var i = 0; i < num; i++) {
          text += currentMonolog.shift() + '.';
        };
        if (currentMonolog.length) {
          text += ' Ska jag berätta mer?';
          isMore = true;
        }
      }

      snacka(text);

      if (isMore) {
        annyang.addCommands({
          'Ja': tellMore
        });
      } else {
        annyang.removeCommands('Ja');
      }

    }
  };

  var renderGrid = function(containerId) {
    db.allDocs().then(function (result) {
      result.rows.map(function (row) {
        var url = getBestImageUrl(row),
          thumbnail = $('<img class="thumbnail">')
            .attr('href', url);
        $('#' + containerId).append(thumbnail);
      });
    }).catch(function (err) {
      console.log(err);
    });
  };

  var commands = {
    // annyang will capture anything after a splat (*) and pass it to the function.
    // e.g. saying "Show me Batman and Robin" is the same as calling showFlickr('Batman and Robin');
    'Vad är (en)(ett) *word( för något)': wikipedia,
    'Berätta om *word': wikipedia,
    'Prata om *word': wikipedia,
    'Vad betyder *word': wikipedia,
    'Hur gör man *word': wikipedia,
    'Var ligger *word': wikipedia,
    'Vem är *word': wikipedia,
    'Vad äter *word': wikipedia,
    'Var bor (det) *word': wikipedia,
    'Var finns det *word': wikipedia,
    'Vad kan du om *word': wikipedia,
    'Vad vet du om *word': wikipedia,
    'Vet du något om *word': wikipedia,
    'Kan du något om *word': wikipedia,

    'Berätta mer': tellMore,
    'Mer': tellMore,
    'Ja (tack)(gärna)': tellMore,

    'Hej( robot)': hello,
    'length': 1
  };

  // Add our commands to annyang
  annyang.init(commands);
  annyang.setLanguage('sv-SE');

  annyang.debug();

  // Start listening. You can call this here, or attach this call to an event, button, etc.
  annyang.start();
  //renderGrid('grid');

annyang.addCallback('result', function(whatWasHeardArray) {
  console.log(whatWasHeardArray)
});

  var snacka = function(text) {
    annyang.abort();
    var msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'sv-SE';
    msg.onend = function (event) {
      console.log('End talk');
      annyang.start();
      $('#face').removeClass('talking');
    };
    window.speechSynthesis.speak(msg);
    $('#face').addClass('talking');
  }
};

