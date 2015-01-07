######################################################################
#
# Ind.ie Builder bootstrap
#
# Copyright (c) 2014 Aral Balkan
# Released under the GNU GPLv3 license
# (https://www.gnu.org/licenses/gpl)
#
# Boots the site builder.
#
# (Basically a live-reload during development.)
#
######################################################################

spawn = require('child_process').spawn
path = require 'path'
Gaze = require('gaze').Gaze

builderProcess = null

restart = ->
	builderProcess.kill()

boot = ->
	#
	# Launch the site, passing along any arguments that we may have
	#
	builderProcess = spawn('coffee', process.argv, {
			cwd: process.cwd(),
			stdio: 'inherit'
	})

	builderProcess.on 'error', (error) ->
		console.log 'Error in Builder process: ' + error

	# builderProcess.on 'close', (code, signal) ->
	# 	console.log 'Builder process received close. Signal: ' + signal + '. Code: ' + code

	builderProcess.on 'exit', (code, signal) ->
		# Only exit if there’s a return code from the process
		# (i.e., if user initiated or something went wrong, not
		# if we’ve killed it.)
		# console.log 'Builder process received exit. Signal: ' + signal + '. Code: ' + code

		if code == 143
			#
			# Reboot
			#
			# console.log 'Rebooting'
			boot()
		else
			#
			# Exit
			#
			# console.log 'Exiting'
			process.exit(code)

# Strip the original command and the script path from the arguments
# and calculate the path to the site.js script.
command = process.argv.shift()
scriptPath = process.argv.shift()

#
# Self-compile: compile the source with a watch
# to help streamline development.
#
pathToBuilderCoffee = path.normalize(path.dirname(scriptPath) + '/../builder.coffee')

# Add the site script to the arguments.
process.argv.unshift(pathToBuilderCoffee)

# Check our own source code so that the site can be restarted if
# the source changes. A little bit of magic to make development easier.
sourceWatcher = new Gaze 'builder/builder.coffee'
sourceWatcher.on 'error', (error) ->
	console.log error
sourceWatcher.on 'changed', (filePath) ->
	# console.log filePath
	restart()

# sourceWatcher.on 'ready', (obj) ->
# 	console.log obj

# Let’s start up the site!
boot()