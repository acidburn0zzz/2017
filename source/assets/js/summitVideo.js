(function () {
    function makeSourceElement(options) {
        var source = document.createElement('source');
        source.type = options.type;
        source.src = options.src;
        source.setAttribute('data-res', options.res);
        return source;
    }

    function addSourceElementsToPlayer(element, sources) {
        sources.forEach(function (source) {
            getPlayerElement(element).appendChild(makeSourceElement(source));
        });
    }

    function mobileFilter(source) {
        return true;
    }

    // Firefox always falls back to flash, so this filter ensures that only the HD stream is available
    // because the quality selector plugin doesn't work with flash yet
    function firefoxFilter(source) {
        return source.type === 'video/mp4' && source.res === 'HD';
    }

    function desktopFilter(source) {
        return source.type === 'video/mp4';
    }

    function getPlayerElement(element) {
        return document.querySelector(element);
    }

    function getFilterForPlatform() {

        if(window.videojs.IS_ANDROID || window.videojs.IS_IOS) {

            return mobileFilter;

        } else if (window.videojs.IS_FIREFOX) {

            return firefoxFilter;

        } else {

            return desktopFilter;

        }

    }

    function sourcesForPlatform(sources) {
        return sources.reverse().filter(getFilterForPlatform());
    }

    function makeSetup(poster) {
        return {preload: "none", plugins: {resolutionSelector: { 'default_res': 'HD'}}};
    }

    function clearSourceElementsFromPlayer(videoElement) {
        Array.prototype.forEach.call(getPlayerElement(videoElement) .querySelectorAll('source'), function (element) {
            element.parentNode.removeChild(element);
        });
    }

    function initializePlayer(options) {

        //clear all the existing sources
        clearSourceElementsFromPlayer(options.element);

        //make and add video video sources
        addSourceElementsToPlayer(options.element, sourcesForPlatform(options.sources));

        // initialize video.js player
        videojs(getPlayerElement(options.element), makeSetup(options.poster));
    }

    window.initializeSummitPlayer = initializePlayer;
})();