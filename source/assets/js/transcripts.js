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
			select.setAttribute('onchange','window.location.href=this.value');
			// remove list from page (as select has replaced functionality)
			list.parentNode.removeChild(list);
		});
	}

	// connect together option and div so aria knows that the option controls the visibility of the div

	// fold up transcripts so only the English one is visible
	function hideOtherTranscripts() {
		// find transcripts and hide them
		Array.prototype.forEach.call(document.querySelectorAll('.transcript-single'), function (transcript) {
			transcript.setAttribute('aria-hidden', 'true');
			transcript.classList.add('hidden');
			console.log(transcript);
		});

		// choose the transcript that is going to be shown (English by default, this can be adjusted later)
		var visibleTranscript = document.getElementById('transcript-en');
		// console.log(visibleTranscript)
		visibleTranscript.setAttribute('aria-hidden', 'false');
		visibleTranscript.classList.remove('hidden');
		visibleTranscriptID = visibleTranscript.id;
		// console.log(visibleTranscriptID);
		visibleTranscriptOption = document.querySelector('[data-transcript-id=' + visibleTranscriptID + ']');
	}

	// Set the state of the transcript.
	function show(transcript, shouldShow) {
		var transcriptID = transcript.id;
		var transcriptOption = document.querySelector('[data-transcript-id=' + transcriptID + ']');

		if (shouldShow) {
			// Show the transcript.
			console.log("Showing transcript: " + transcript.id)
			transcript.classList.remove('hidden', 'transcript-collapsed');
			transcript.classList.add('transcript-expanded');
			transcript.setAttribute('aria-hidden', 'false');

			// set aria expanded true on select menu option
			transcriptOption.setAttribute('aria-expanded', 'true');
		} else {
			// Hide the transcript.
			console.log("Hiding transcript: " + transcript.id)
			transcript.classList.add('hidden', 'transcript-collapsed');
			transcript.classList.remove('transcript-expanded');
			transcript.setAttribute('aria-hidden', 'true');

			// set aria expanded false on select menu option
			transcriptOption.setAttribute('aria-expanded', 'false');
		}
	}

	// switch the visible state of the transcripts
	function switchTranscript(transcriptSelect) {
		var selectedOption = transcriptSelect.getAttribute('data-transcript-id');
		// console.log(selectedOption);
		var selectedTranscript = document.querySelector('#' + selectedOption);
		// console.log(selectedTranscript);

		// if the selected selectedTranscript isn't hidden, don't do anything
		// if the selectedTranscript isn't the selected selectedTranscript, hide it
		// if the selected selectedTranscript is hidden, show it

		// show the chosen selectedTranscript
		var isHidden = (selectedTranscript.classList.contains('hidden') === 'true');
		console.log(isHidden)

		show(selectedTranscript, !isHidden);
		// find all other transcripts, and hides them
		// show(transcript, true);
	}

	// when the relevant transcript is selected from the dropdown, show that transcript text
	function addTranscriptMenuClickHandlers() {
        Array.prototype.forEach.call(document.querySelector('#transcript-select'), function (transcriptSelect) {
            transcriptSelect.addEventListener('click', function (event) {
                // console.log('a click!');
                console.log(transcriptSelect);
                switchTranscript(event.currentTarget);
            });
        });
    }

	// when one transcript is shown, hide the others

	transcriptListIntoDropdown();
	hideOtherTranscripts();
	addTranscriptMenuClickHandlers();
})();