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

    var PAGE_LENGTH = 100;

    var currentPage = 1;

    var signatories = [];

    function numberOfPages(signatories) {
        return Math.ceil(signatories.length/PAGE_LENGTH);
    }

    function initializePages(signatories) {
        var pages = new Array(numberOfPages(signatories)),
        i = 0, len = pages.length;

        for(; i < len; i += 1) {
            pages[i] = [];
        }

        return pages;
    }

    function toPages(signatories) {
        var pages = initializePages(signatories),
        i = 0, len = signatories.length;

        for(; i < len; i += 1) {
            pages[Math.floor(i / PAGE_LENGTH)].push(signatories[i]);
        }

        return pages;
    }

    function showSignatures(pageNumber) {
        currentPage = pageNumber + 1;

        showSignatoryCount();

        showPagers();

        showPage(pageNumber);
    }

    function showSignatoryCount() {
        document.querySelector('.signature--number .number').textContent = signatories.length.toString();
    }

    function showPage(pageNumber) {

        document.querySelector('.signatures').innerHTML = '';

        toPages(signatories)[pageNumber].forEach(function (item) {
            showSignatory(item);
        });
    }

    function showPagers() {
        showTopPager();
        showBottomPager();
    }

    function showTopPager() {
        showPager(document.querySelector('#topPagination'));
    }

    function showBottomPager() {
        showPager(document.querySelector('#bottomPagination'));
    }

    function showPager(parent) {
        var ul = parent.querySelector('ul.pages');

        ul.innerHTML = '';

        var i = 0, len = numberOfPages(signatories);

        for(; i < len; i += 1) {
            addPagerElement(ul, i + 1, i + 1 === currentPage);
        }
    }

    function addPagerElement(parent, pageNumber, active) {
        var li = document.createElement('li'),
        a = document.createElement('a');
        li.appendChild(a);

        if(active) a.classList.add('active');

        a.textContent = pageNumber.toString();

        a.href = '#';

        a.dataset.page = pageNumber.toString();

        a.addEventListener('click', pagerClickHandler);

        parent.appendChild(li);
    }

    function pagerClickHandler(e) {

        e.preventDefault();

        pager = e.currentTarget;

        pageNumber = parseInt(pager.dataset.page);

        showSignatures(pageNumber - 1);
    }

    function getNameElement() {
        return document.querySelector('#name');
    }

    function getNameFromForm() {
        return getNameElement().value;
    }

    function getEmailElement() {
        return document.querySelector('#email');
    }

    function getEmailFromForm() {
        return getEmailElement().value;
    }

    function signupToManifesto(name, email) {
        request.post('http://localhost:3000/manifesto/sign')
        .send({name: name, email: email, ajax: true})
        .set('Accept', 'application/json')
        .end(function (err, res) {
            if(err) {
                console.error(err);
                showGeneralError();
                return;
            }

            if(res.ok) {
                showSuccess(name);
                //getSignatories(processSignatories);
            } else {
                console.error('Error', res.body);
                showGeneralError();
            }
        });
    }

    function signupButtonClicked(e) {
        e.preventDefault();

        if (validateSignup()) {
            signupToManifesto(
                getNameFromForm(),
                getEmailFromForm()
            );
        }
    }

    function getSignatories(callback) {
        console.log('getting');
        request.get('http://localhost:3000/manifesto/signatories')
        .set('Accept', 'application/json')
        .end(callback);
    }

    function makeSignatoryItem(signatory) {
        li = document.createElement('li');
        li.textContent = signatory;
        return li;
    }

    function makeConfirmationNotification() {
        div = document.createElement('div');
        div.classList.add('notification');
        div.classList.add('warning');
        div.innerHTML = '<strong>Almost there…</strong> We\'ve sent you an email to confirm it\'s really you. Please click the link in the email to confirm your signature.';
        return div;
    }

    function makeLastSignatoryItem(signatory) {

        li = makeSignatoryItem(signatory);
        li.classList.add('my-signature');
        li.insertBefore(makeConfirmationNotification(), li.firstChild);
        return li;
    }

    function showSignatory(signatory) {
        document.querySelector('.signatures').appendChild(makeSignatoryItem(signatory));
    }

    function processSignatories(err, results) {
        if(err) {
            console.error(err);
            return;
        }

        signatories = results.body.filter(function (item) {return !!item;});

        showSignatures(0);
    }

    function isNameValid() {
        return getNameFromForm() && getNameFromForm().length && getNameFromForm().length > 0;
    }

    function isEmailValid() {
        return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(getEmailFromForm());
    }

    function showGeneralError() {
        document.querySelector('#signup-error').classList.remove('hide');
    }

    function showNameError() {
        getNameElement().parentNode.classList.add('error');
        getNameElement().nextElementSibling.classList.remove('hide');
    }

    function hideNameError() {
        getNameElement().parentNode.classList.remove('error');
        getNameElement().nextElementSibling.classList.add('hide');
    }

    function showEmailError() {
        getEmailElement().parentNode.classList.add('error');
        getEmailElement().nextElementSibling.classList.remove('hide');
    }

    function hideEmailError() {
        getEmailElement().parentNode.classList.remove('error');
        getEmailElement().nextElementSibling.classList.add('hide');
    }

    function appendNewSignature(name) {
        document.querySelector('.signatures').appendChild(makeLastSignatoryItem(name));
    }

    function showLastPage() {
        showSignatures(numberOfPages(signatories) -1);
    }

    function getElementTop(element) {
        function getElementTopR(element, current) {
            if(!element) {
                return current;
            }
            return getElementTopR(element.offsetParent, current + element.offsetTop);
        }

        return getElementTopR(element, 0);
    }

    function scrollToNewSignature() {
        window.scrollTo(window.scrollX, getElementTop(document.querySelector('div.notification.warning')));
    }

    function showSuccess(name) {
        showLastPage();
        appendNewSignature(name);
        scrollToNewSignature();
    }

    function validateEmail() {
        if (!isEmailValid()) {
            showEmailError();
            return false;
        }

        hideEmailError();
        return true;
    }

    function validateName() {
        if (!isNameValid()) {
            showNameError();
            return false;
        }

        hideNameError();
        return true;
    }

    function validateSignup() {
        var nameValid = validateName();
        var emailValid = validateEmail();

        return nameValid && emailValid;
    }

    var signButton = document.querySelector('#manifesto--sign');

    signButton.addEventListener('click', signupButtonClicked);

    definitionTextIntoButtons();

    closeAllDefinitionText();

   addDefinitionClickHandlers();

    document.addEventListener('DOMContentLoaded', function(event) {
        getSignatories(processSignatories);
    });
})();