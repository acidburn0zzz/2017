// TODO: make select voiceover accessible (doesn't do anything with keyboard navigation)
// TODO: make correct transcript selected dependent on URL (in case someone arrives at #transcript-es etc)

(function () {

	function transcriptListIntoDropdown() {
		Array.prototype.forEach.call(document.querySelectorAll('.transcript-navigation'), function (list) {
			// find the transcript navigation list
			var transcriptNavigation = document.querySelector('.transcript-navigation');
				var list = transcriptNavigation.getElementsByTagName('ul')[0];
				// console.log(list);
				list.classList.add('transcript-navigation-list');
			// turn the navigation list into a select input
			// create an empty select
			var select = document.createElement('select');
				select.classList.add('transcript-navigation-select');
				select.setAttribute('id','transcript-select')

			// get the list item
			var listItems = list.getElementsByTagName('li');
			// console.log(listItems);

			Array.prototype.forEach.call(listItems, function (listItem) {
				// for each list item:
				// - add the list item to the select
				var option = document.createElement('option');
				// - get the a href
				listItemURL = listItem.childNodes[0].href;
				// console.log(listItemURL);
				// - apply the href to the opt value
				option.value = listItemURL;
				// console.log(option.value);
				// - apply the data id to the opt data id
				listItemID = listItem.childNodes[0].getAttribute('data-transcript-id');
				option.setAttribute('data-transcript-id', listItemID);
				// - apply the relevant id to the aria-controls attribute
				option.setAttribute('aria-controls', listItemID);
				// - apply aria-expanded-false to everything
				option.setAttribute('aria-expanded', 'false');
				// - get the text
				listItemText = listItem.childNodes[0].text;
				// console.log(listItemText);
				// - apply the text to the opt text
				option.text = listItemText;
				// console.log(option.text);
				// add option to select
				select.add(option);
			});
			// add select to the page
			list.parentNode.insertBefore(select, list);
			// add linking functionality to select
			// select.setAttribute('onchange','window.location.href=this.value');
			// remove list from page (as select has replaced functionality)
			list.parentNode.removeChild(list);
		});
	}

	function hideAllTranscripts() {
	// find transcripts and hide them
		Array.prototype.forEach.call(document.querySelectorAll('.transcript-single'), function (transcript) {
			var transcriptID = transcript.id;
			var transcriptOption = document.querySelector('[data-transcript-id=' + transcriptID + ']');

			transcript.setAttribute('aria-hidden', 'true');
			transcript.classList.add('hidden');
			transcriptOption.setAttribute('aria-expanded', 'false');
			transcriptOption.removeAttribute('selected');
		});
	}

	function findURLIDandMatchingTranscript() {
		// get the URL's ID
		var urlID = window.location.hash;
		// console.log("The URL ID is: " + urlID);

		// if the URL has an ID, get it
		if (urlID === "") {
			// console.log("There's no ID")
			visibleTranscript = document.getElementById('transcript-en');
		} else {
			// console.log("There's an ID")
			// get the first character in the string to the end of the string (everything)
			var urlIDWithoutTheHash = urlID.substr(1);

			// check if there's a transcript with the same ID
			var matchingTranscript = document.getElementById(urlIDWithoutTheHash);
			matchingTranscriptId = matchingTranscript.id;
			// console.log("The matching transcript is: " + matchingTranscriptId);
			visibleTranscript = document.getElementById(matchingTranscriptId);
		}
	}

	function chooseVisibleTranscript() {
		// if there's an #internal-link in the URL which corresponds with a transcript ID, then set that as the visible transcript
		findURLIDandMatchingTranscript();
		// if there's no #internal-link in the URL, just go with the English transcript
		// (without the var, it's a global variable, rather than restricted to this function)
	}

	// fold up transcripts so only the English one is visible
	function hideOtherTranscripts() {
		hideAllTranscripts();
		// choose the transcript that is going to be shown (English by default, this can be adjusted later)
		chooseVisibleTranscript();
		// console.log(visibleTranscript)
		visibleTranscript.setAttribute('aria-hidden', 'false');
		visibleTranscript.classList.remove('hidden');
		visibleTranscriptID = visibleTranscript.id;
		// console.log(visibleTranscriptID);
		visibleTranscriptOption = document.querySelector('[data-transcript-id=' + visibleTranscriptID + ']');
		// set aria expanded true on select menu option
		visibleTranscriptOption.setAttribute('aria-expanded', 'true');
		// set selected state to select menu option
		visibleTranscriptOption.setAttribute('selected', 'selected');
	}

	// Set the state of the transcript.
	function show(transcript, shouldShow) {
		var transcriptID = transcript.id;
		var transcriptOption = document.querySelector('[data-transcript-id=' + transcriptID + ']');

		if (shouldShow) {
			// Show the transcript.
			// console.log("Showing transcript: " + transcript.id)
			hideAllTranscripts();
			transcript.classList.remove('hidden', 'transcript-collapsed');
			transcript.setAttribute('aria-hidden', 'false');

			// set aria expanded true on select menu option
			transcriptOption.setAttribute('aria-expanded', 'true');
			// set selected state to select menu option
			transcriptOption.setAttribute('selected', 'selected');
		} else {
			// Hide the transcript.
			// console.log("Hiding transcript: " + transcript.id)
			transcript.classList.add('hidden', 'transcript-collapsed');
			transcript.setAttribute('aria-hidden', 'true');

			// set aria expanded false on select menu option
			transcriptOption.setAttribute('aria-expanded', 'false');
			// remove the selected attribute
			transcriptOption.removeAttribute('selected');
		}
	}

	// switch the visible state of the transcripts
	function switchTranscript(transcriptSelect) {
		var selectedOption = transcriptSelect.getAttribute('data-transcript-id');
		// console.log("Selected option:" + selectedOption);
		var selectedTranscript = document.querySelector('#' + selectedOption);
		// console.log("Selected transcript:" + selectedTranscript);

		// if the transcript has the hidden class
		var isHidden = (selectedTranscript.className.match('hidden') === 'true');
		// console.log("Is it hidden?" + isHidden)

		// run the transcript through the show/hide function
		show(selectedTranscript, !isHidden);
		// find all other transcripts, and hides them

	}

	// when the relevant transcript is selected from the dropdown, show that transcript text
	function addTranscriptMenuChangeHandlers() {

		var transcriptSelect = document.getElementById('transcript-select')

		// console.log('Adding to: ' + transcriptSelect);

		transcriptSelect.addEventListener('change', function (event) {
			var selectionBox = event.currentTarget

			// Update the URL
			var selectionBoxValue = selectionBox.value
			window.location.href=selectionBoxValue

			// Update URL and matching transcript
			findURLIDandMatchingTranscript();

			// Handle the transcript switch.
			var selectedOption = selectionBox.options[selectionBox.selectedIndex]
			switchTranscript(selectedOption);
		}, true);
	}

	// when one transcript is shown, hide the others

	transcriptListIntoDropdown();
	hideOtherTranscripts();
	addTranscriptMenuChangeHandlers();
})();