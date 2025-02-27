(function (window, document, $) {
  "use strict";

  var Init = {
    i: function (e) {
      Init.s();
      Init.methods();
    },
    s: function (e) {
      (this._window = $(window)),
        (this._document = $(document)),
        (this._body = $("body")),
        (this._html = $("html"));
    },
    methods: function (e) {
      Init.preloader();
      Init.hamburgerMenu();
    },
    preloader: function () {
      var loader;
      function loadNow(opacity) {
        if (opacity <= 0) {
          displayContent();
        } else {
          loader.style.opacity = opacity;
          window.setTimeout(function () {
            loadNow(opacity - 0.02);
          }, 20);
        }
      }

      function displayContent() {
        loader.style.display = 'none';
      }

      document.addEventListener("DOMContentLoaded", function () {
        loader = document.getElementById('loader');
        loadNow(1);
      });
    },
    // Ham Burger Menu
    hamburgerMenu: function () {
      if ($(".hamburger-menu").length) {
        $('.hamburger-menu').on('click', function () {
          $('.bar').toggleClass('animate');
          $('.mobile-navar').toggleClass('active');
          return false;
        })
        $('.has-children').on('click', function () {
          $(this).children('ul').slideToggle('slow', 'swing');
          $('.icon-arrow').toggleClass('open');
        });
      }
    },
  };
  Init.i();

  window.indexFunctions = function () {
    adjustVideoWidths();
    setMovieListingHeight();
  };


  //###################################################################
  function adjustVideoWidths() {
    const videoPlayer = document.querySelector('.inner-banner .videoplayer');
    const videos = videoPlayer.querySelectorAll('canvas');
    const videoContainer = document.getElementById('video');
    const numberOfVideos = videos.length;
    var videoPlayerColumn = document.getElementById('videoPlayerColumn');
    var movieListingColumn = document.getElementById('movieListingColumn');

    const marginBetweenVideosPx = 10;
    const totalMarginSpace = marginBetweenVideosPx * (numberOfVideos - 1);

    //console.log("numberOfVideos: " + numberOfVideos)

    if (numberOfVideos === 1) {

      // Reset flex properties
      videoContainer.style.display = 'block'; // Ensure it is set to block
      videoContainer.style.flexWrap = '';
      videoContainer.style.justifyContent = '';
      videoContainer.style.alignItems = '';

      // Adjust grid columns for single video scenario
      videoPlayerColumn.className = 'col-xxl-9 col-lg-7'; // Ensure only these classes are set
      movieListingColumn.className = 'col-xxl-3 col-lg-5';
    }

    if (numberOfVideos === 2) {

      // Reset flex properties
      videoContainer.style.display = 'block'; // Ensure it is set to block
      videoContainer.style.flexWrap = '';
      videoContainer.style.justifyContent = '';
      videoContainer.style.alignItems = '';

      // Adjust grid columns for multiple videos scenario
      videoPlayerColumn.className = 'col-xxl-15 col-lg-15'; // Adjust according to your layout needs
      movieListingColumn.className = 'col-xxl-15 col-lg-15'; // Hide the movie listing column effectively
    }

    // Hide the movie list if there is more than one video, otherwise show it
    if (numberOfVideos > 2) {

      // Apply flexbox styles for more than one video
      videoContainer.style.display = 'flex';
      videoContainer.style.flexWrap = 'wrap';
      videoContainer.style.justifyContent = 'center';
      videoContainer.style.alignItems = 'center';

      // Adjust grid columns for multiple videos scenario
      videoPlayerColumn.className = 'col-xxl-15 col-lg-15'; // Adjust according to your layout needs
      movieListingColumn.className = 'col-xxl-15 col-lg-15'; // Hide the movie listing column effectively
    }


    // Set the width for each video and adjust margin
    videos.forEach((video, index) => {
      let widthPercent;

      if (numberOfVideos === 1) {
        // If there's only one video, it should take up the entire width minus any total margin space.
        widthPercent = 100;
        video.style.width = `${widthPercent}%`;
      } else if (numberOfVideos === 2) {
        // Divide the available space evenly between the two videos.
        widthPercent = (100 - (totalMarginSpace / videoPlayer.offsetWidth) * 100) / numberOfVideos;
        videos.forEach((video, index) => {
          video.style.width = `calc(${widthPercent}% - ${marginBetweenVideosPx / numberOfVideos}px)`;
          video.style.marginRight = index === 0 ? `${marginBetweenVideosPx}px` : 'auto';
        });

      } else if (numberOfVideos === 3) {
        // For three videos, adjust width for a better fit considering total margin space.
        widthPercent = (100 - (totalMarginSpace / videoPlayer.offsetWidth) * 100) / numberOfVideos;
        video.style.width = `${widthPercent}%`;

        // Adjust margins for all videos
        if (index < 2) {  // Apply margin right only for the first two videos
          video.style.marginRight = '10px'; // Set a fixed right margin for uniform spacing.
          video.style.marginLeft = '';
        } else {
          // No right margin for the last video
          video.style.marginRight = '0';
          video.style.marginLeft = '';
        }

        // Adjust margins to ensure the last video is centered by itself
        if (index === 2) {
          video.style.marginLeft = 'auto';  // Auto margins to center the video
          video.style.marginRight = 'auto';
        }
      } else if (numberOfVideos === 4) {

        widthPercent = (100 - (totalMarginSpace / videoPlayer.offsetWidth) * 100) / numberOfVideos;

        // Set width and margin for each video
        videos.forEach((video, index) => {
          video.style.width = `${widthPercent}%`;
          video.style.marginRight = (index % 2 === 0) ? `${marginBetweenVideosPx}px` : 'auto'; //impares: right-> 10px left-> auto
          video.style.marginLeft = (index % 2 === 0) ? 'auto' : '';
          video.style.marginBottom = '10px'; // Margin bottom for spacing between rows
        });

      }
    });
  }

  adjustVideoWidths();

  // Adjust video widths on window resize
  window.addEventListener('resize', adjustVideoWidths);

  //###################################################################
  function setMovieListingHeight() {
    const videoPlayer = document.querySelector('.inner-banner .videoplayer');
    const videos = videoPlayer.querySelectorAll('video');
    const numberOfVideos = videos.length;
    const video = document.querySelector('#video');

    const movieListing = document.querySelector('.inner-banner .movie-listing');
    const videoBackground = document.querySelector('.inner-banner .videoplayer .videoBackground');
    const isVideoBackgroundVisible = videoBackground && getComputedStyle(videoBackground).display !== 'none';
    const messageAlert = document.querySelector('#message');

    if (numberOfVideos > 1) {
      messageAlert.style.width = "";
    } else {
      if (video && movieListing) {
        if (window.innerWidth > 991) {
          const videoWidth = video.offsetWidth;
          const videoHeight = (videoWidth * 56.25) / 100;

          movieListing.style.height = videoHeight + 'px';
          messageAlert.style.width = window.getComputedStyle(movieListing).width;

          if (isVideoBackgroundVisible) {
            videoBackground.style.height = videoHeight + 'px';
          }
        } else {
          messageAlert.style.width = '';
          movieListing.style.height = 370 + 'px';
          if (isVideoBackgroundVisible) {
            videoBackground.style.height = 370 + 'px';
          }
        }
      }
    }
  }

  // Call the function on page load
  setMovieListingHeight();

  // Call the function when the window is resized
  window.addEventListener('resize', setMovieListingHeight);
  /*****************************************************************************/

  function setupListClickListeners() {
    const lists = document.querySelectorAll('.movie-listing .episode-list');
    lists.forEach(list => {
      list.addEventListener('click', function () {
        adjustVideoWidths();
        setMovieListingHeight();
      });
    });
  }

  // Setup click listeners once the page content is fully loaded
  setupListClickListeners();


})(window, document, jQuery);
