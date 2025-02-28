document.addEventListener("DOMContentLoaded", function () {
    OverlayScrollbars(document.querySelectorAll('.inner-banner .movie-listing'), {
    });

    /*****************************************************************************/
    var prevScrollpos = window.pageYOffset;
    window.onscroll = function () {
        var currentScrollPos = window.pageYOffset;
        var topnavElements = document.querySelectorAll(".topnav");
        topnavElements.forEach(function (element) {
            if (prevScrollpos > currentScrollPos) {
                element.style.top = "0";
            } else {
                element.style.top = "-50px";
            }
        });
        prevScrollpos = currentScrollPos;
    };

    /*****************************************************************************/
    $('.topnav .open_sidebar #open_hamburger').on('click', function () {
        $('.navigation').addClass('open');
    });
    $('.navigation .close_sidebar #close_hamburger').on('click', function () {
        $('.navigation').removeClass('open');
    });
    $('.navigation .has-menu a').on('click', function (e) {
        e.stopPropagation();
    });
    $('.navigation .has-menu').on('click', function () {
        $(this).toggleClass('open');
    });

    // Document click to close navigation if open
    $(document).on('click', function (e) {
        var $nav = $('.navigation');
        // Check if the click is outside of navigation and if navigation is open
        if (!$nav.is(e.target) && $nav.has(e.target).length === 0 && $nav.hasClass('open') && !$('.topnav .open_sidebar #open_hamburger').is(e.target)) {
            $nav.removeClass('open');
        }
    });
});