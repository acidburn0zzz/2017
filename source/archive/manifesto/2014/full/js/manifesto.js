(function () {
    var request = superagent;

    // turn definition text links into buttons
    function definitionTextIntoButton(dfn) {
        var definitionText = dfn;
        var definitionDescriptionID = dfn.getAttribute('data-definition-text-id');
        console.log(definitionText);

        // create button
        var definitionButton = document.createElement('button');
        // put text from link into button
        // get text from link
        var definitionLink = dfn.getElementsByTagName('a')[0].childNodes[0];
        console.log(definitionLink);
        var definitionLinkText = definitionLink.textContent;
        // console.log(definitionLinkText);
        // assign link text to button
        definitionButton.innerHTML = definitionLinkText;
        // put data attribute from text into button
        definitionButton.setAttribute('data-definition-text-id', definitionDescriptionID);
        // give button link class
        definitionButton.classList.add('definition-link');
        // add button
        definitionText.parentNode.insertBefore(definitionButton, definitionText);
        // remove old definition
        definitionText.parentNode.removeChild(definitionText);
    }

    // link the definitions to their definition text with aria, and specify that they're collapsed
    function connectDefinitionWithDefinitionText(definitionButton) {
        var definitionText = definitionButton;
        // give definition text the aria expanded attribute (expanded, false = collapsed)
        definitionText.setAttribute('aria-expanded', 'false');

        var definitionDescriptionID = definitionButton.getAttribute('data-definition-text-id');
        // give definition text the aria controls attribute with the ID of the definition description
        definitionText.setAttribute('aria-controls', definitionDescriptionID);
    }

    // toggle the visible state of the definitions
    function toggleDefinitionText(definitionButton) {

        var definitionDescription = document.querySelector('#' + definitionButton.dataset.definitionTextId);

            if (definitionDescription.hasAttribute('aria-hidden')) {
                // Toggle the visible state.
                var ariaHidden = (definitionDescription.getAttribute('aria-hidden') === "true");
                hide(definitionDescription, !ariaHidden);
                // console.log(typeof ariaHidden);
            } else {
                // First time through, we know that it is showing. Hide it.
                hide(definitionDescription, true);
            }
    }

    // Set the state of the definition description.
    function hide(definitionDescription, shouldHide) {
        var definitionDescriptionID = definitionDescription.id;
        var definitionText = document.querySelector('[data-definition-text-id=' + definitionDescriptionID + ']');

        if (shouldHide) {
            // Hide the definitionDescription.
            // console.log("Hiding definitionDescription: " + definitionDescription.id)
            definitionDescription.classList.add('hidden', 'definition-collapsed');
            definitionDescription.classList.remove('definition-expanded');
            definitionDescription.setAttribute('aria-hidden', 'true');

            // set aria expanded false on definition text
            definitionText.setAttribute('aria-expanded', 'false');
        } else {
            // Show the definitionDescription.
            // console.log("Showing definitionDescription: " + definitionDescription.id)
            definitionDescription.classList.remove('hidden', 'definition-collapsed');
            definitionDescription.classList.add('definition-expanded');
            definitionDescription.setAttribute('aria-hidden', 'false');

            // set aria expanded true on definition text
            definitionText.setAttribute('aria-expanded', 'true');
        }
    }

    function definitionTextIntoButtons() {
        Array.prototype.forEach.call(document.querySelectorAll('dfn'), function (dfn) {
            definitionTextIntoButton(dfn);
        });
    }

    function closeAllDefinitionText() {
        Array.prototype.forEach.call(document.querySelectorAll('.definition-link'), function (definitionButton) {
            connectDefinitionWithDefinitionText(definitionButton);
            toggleDefinitionText(definitionButton);
        });
    }

    function addDefinitionClickHandlers() {
        Array.prototype.forEach.call(document.querySelectorAll('.definition-link'), function (definitionButton) {
            definitionButton.addEventListener('click', function (event) {
                // console.log("a click!");
                toggleDefinitionText(event.currentTarget);
            });
        });
    }

    definitionTextIntoButtons();

    closeAllDefinitionText();

   addDefinitionClickHandlers();

})();