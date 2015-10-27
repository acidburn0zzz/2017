######################################################################
#
# Ind.ie site builder.
#
# Copyright (c) 2014 Aral Balkan
# Released under the GNU GPLv3 license
# (https://www.gnu.org/licenses/gpl)
#
######################################################################

Promise = require 'bluebird'
Gaze = require('gaze').Gaze
program = require 'commander'

exec = require('child_process').exec

slug = require('slug')
swig = require('swig')

moment = require('moment')
marked = require 'marked'
Express = require 'express'
path = require 'path'
pathExtra = require 'path-extra'
chalk = require 'chalk'

ProgressBar = require 'progress'

Rsync = require 'rsync'

pwuid = require 'pwuid'

git = require 'gift'
repoWithCallbacks = git '.'
repo = Promise.promisifyAll repoWithCallbacks


######################################################################
#
# 	Promisified libraries and methods
#
######################################################################

#
# fs.exists cannot be automatically promisified
#
fsExistsAsync = (filePath)->
	return new Promise ((fulfill, reject) ->
		exists = fs.existsSync(filePath)
		process.nextTick(->
			fulfill(exists)
		)
	)

# Note: accord uses when.js and the promises are compatible with bluebird.
# ==== (see http://promisesaplus.com/implementations)
accord = require 'accord'
stylus = accord.load('stylus')

# Promise.promisifyAll doesn’t work with imagemin.
# The only method we’re using is the .optimize() method so let’s just promisify that.
Imagemin = require('imagemin')

Imagemin.prototype.optimizeAsync = Promise.promisify(Imagemin.prototype.run)

# Exec
execAsync = Promise.promisify(exec)

fs = Promise.promisifyAll(require('fs-extra'))

# Roll our own promise for kit — Promise.promisify isn’t working on
# the kit function (maybe because it is synchronous?)
kit = require 'node-kit'
kitAsync = (str) ->
	return new Promise ((fulfill, reject) ->
		str = kit(str)
		process.nextTick(->
			fulfill(str)
		)
	)

globAsync = Promise.promisify(require('glob'))



######################################################################
#
# Initialisations
#
######################################################################

progressBar = null

######################################################################
#
# 	General helpers
#
######################################################################

# Generic log that uses either the REPL log, if it exists, or console log, otherwise.
log = (message) ->
	if (repl)
		repl.log message
	else
		console.log message

# Verbose log (only displays if --verbose is set as an option)
verbose = (message) ->
	if program.verbose
		log message

#
# Returns a formatted string suitable for display that summarises the
# current branch and status of the git repo
#
gitRepoBranchAndStatusString = ->
	repo.branchAsync().then (branch) ->
		repo.statusAsync().then (status) ->
			gitMessageBoldColour = if status.clean then chalk.green.bold.inverse else chalk.yellow.bold.inverse
			dirtyIndicator = if status.clean then ' ' else '* '
			branchNameAndStatusInversedBold = gitMessageBoldColour("#{branch.name} #{dirtyIndicator}")
			return branchNameAndStatusInversedBold

updatePrompt = ->
	gitRepoBranchAndStatusString().then (gitStatusString) ->
		newPrompt = gitStatusString + chalk.blue.inverse('➔ ') + ' '
		repl.setPrompt newPrompt

#
# Makes string replacements at deployment-time.
# All file paths should be relative to the /public folder
#
# TODO: Create a cache of these files and only
# ===== update if they’ve changed (not on every)
#       deployment.
#
# TODO: Add ability to apply to any file
# ===== (glob pattern)
#
makeDeploymentStringReplacements = (content) ->
	replacements = [
		{
			file: 'assets/js/manifesto.js',
			find: 'http://localhost:3000/manifesto/sign',
			replace: 'https://api.ind.ie/manifesto/sign'
		},
		{
			file: 'assets/js/manifesto.js',
			find: 'http://localhost:3000/manifesto/signatories',			
			replace: 'https://api.ind.ie/manifesto/signatories'
		},
		{
			file: 'supporters/index.html',
			find: 'http://10.0.1.123:5000/api/supporters',
			replace: '/api/supporters'
		}
	]

	return Promise.each replacements, (replacement) =>
		# log 'Replacing ' + (replacement.find) + ' with ' + (replacement.replace) + '…'
		fileToRead = process.cwd() + '/public/' + replacement.file
		# log 'About to read: ' + fileToRead
		fs.readFileAsync fileToRead, 'utf8'
			.then (content) =>
				content = content.replace(replacement.find, replacement.replace)
				# log 'Made replacement in ' + fileToRead + ': ' + replacement.find + ' -> ' + replacement.replace
				fs.writeFileAsync fileToRead, content
					# .then ->
					# 	log 'Replacements complete.'
			.catch ((e) ->
				log e
			)

######################################################################
#
# 	Log helpers
#
######################################################################

# Displays just the top-level folder name and file name of a passed filePath
# (Useful when logging to avoid repeating long path names).
shortFilePath = (filePath) ->
	topLevelFolder = path.dirname(filePath).split(path.sep).pop()
	return topLevelFolder + path.sep + path.basename(filePath)

logCompileMessage = (event, filePath) ->
	if event != 'build'
		log ('— ' + moment().format('dddd, D MMM @ H:m: ') + 'Compiled ' + shortFilePath(filePath) + ' (' + event + ')\n')



######################################################################
#
# 	Command-line options and commands
#	(used by both the command line arguments and the REPL)
#
######################################################################

program.version('0.0.1')
program.option '-d, --dry-run', 'dry run'
program.option '--verbose'

#
# Edit
#

program
	.command 'edit'
	.description 'Opens the site in Sublime Text.'
	.action () ->
		exec('subl .')

#
# Open
#

program
	.command 'view'
	.description 'Opens the site in the browser for viewing'
	.action () ->
		exec 'open http://localhost:8000'

#
# Build
#

program
	.command('build [options]')
	.description('Builds the whole site. Options: no-cache (full rebuild, very slow), partials (ignores .html and .styl), or pass in an extension to ignore the cache for (e.g., build .styl or build .html')
	.action (options) ->
		if options == 'no-cache'
			fs.removeAsync('.cache/site').then ->
				buildSite()
		else
			buildSite(options)

#
# Deploy
#

program
	.command('deploy')
	.description('Deploys the site')
	.action () ->
		deploy()

#
# General
#

program
	.command('help')
	.description('Output help')
	.action (options) ->
		program.outputHelp()

program
	.command('exit')
	.description('Bye bye!')
	.action (options) ->
		log '\nGoodbye!\n'
		process.exit(0)

program
	.command('*')
	.description('Catchall')
	.action (args...) ->
		#
		# Default action — proxy to the command line.
		#
		rawArgs = (args[args.length-1]).parent.rawArgs

		# Remove the process info
		rawArgs.shift()
		rawArgs.shift()
		
		commandToProxy = rawArgs.join ' '

		execAsync commandToProxy, {cwd: process.cwd(), env: process.env}
			.then (stdout) ->
				log '\n' + chalk.white(stdout[0])
				updatePrompt()

			.catch Promise.OperationalError, (e) ->
				log '\n' + (chalk.red.inverse e.message)
				updatePrompt()

			.catch ((e) ->
				log '\n' + chalk.red.inverse ('Error: ' + e)
				updatePrompt()				
			)

######################################################################
#
# 	Global file system watcher
#
######################################################################

globalWatcher = null

#
# Stop watching for source file changes.
#
stopWatchingForSourceFileChanges = ->
	globalWatcher.close(true)

#
# Start watching for source file changes.
#
startWatchingForSourceFileChanges = ->
	globalWatcher = new Gaze 'source/**/*'
	globalWatcher.on 'ready', (watcher) ->
		log '\nWatching for source file changes…\n'
	globalWatcher
		.on 'all', (event, filePath) ->

			verbose 'Global watcher: ' + event + ': ' + filePath

			# Check if the file has been deleted. (If so, it won’t have stats)
			if event is 'deleted'
				deleteFile filePath			

			#
			# Otherwise, let’s continue.
			#
			processSourceFile event, filePath


######################################################################
#
# 	Process source files.
#	=====================
#
#	Handles Kit, Stylus, image compression.
#
#	(Does the majority of the “grunt” work — haha! Umm… yes.)
#
#	File types we don’t know how to deal with (based on file extension)
#	as well as directories are copied over to the build folder as is.
#
#	Files and folders deleted from the source folder are also
#	deleted from the build folder. (Note: if you move to trash, the
#	system will delete the file completely—also from trash—this should
#	not be a problem as everything is under source control.)
#
#	This function is called by both the global file system watcher
#	and the main build function.
#
######################################################################

processSourceFile = (event, filePath) ->

	verbose 'Processing source file: ' + filePath
	
	fs.statAsync(filePath).then (stats) ->

		# if error
		# 	log error
		# 	log 'Error getting stats for ' + filePath
		# 	return
		
		if (event is 'renamed') and (filePath.indexOf('.Trash') > 0)
			# On OS X, deleted files are moved to the Trash
			# Not tested on other platforms.
			event = 'trashed'

		#
		# Directory is affected
		#
		if stats.isDirectory() and event is not 'build'
		
			if event is 'changed' or event is 'added' or event is 'renamed'
				return copyFile event, filePath

			else if event is 'trashed'
				verbose 'Directory was trashed; deleting it.' 
				deleteFile filePath
			
		#
		# File is affected.
		#	
		else if stats.isFile()

			ext = path.extname(filePath)

			#
			# File should be processed if it is changed, added, or renamed.
			# If we don’t know what to do with a file with the given 
			# extension, we simply copy it over. (Better Safe Than Sorry™) 
			#
			if event is 'build' or event is 'changed' or event is 'added' or event is 'renamed'

				#
				# Calculate the files’s new MD5 checksum and add it to the cache
				#
				cachePath = filePath.replace 'source', '.cache/site'
				fs.readFileAsync(filePath).then (fileContents) =>
					md5Checksum = checksum fileContents
					# log 'Writing out new file checksum ' + md5Checksum + ' for cache: ' + cachePath
					fs.ensureFileAsync(cachePath).then ->
						fs.writeFileAsync(cachePath, md5Checksum)
							# .then =>
							# 	log 'Done.'
							.then =>

								#
								# Kit
								#

								if ext is '.html' #or ext is '.kit'
									# It’s a kit file (with .html extension as per our convention)
									compileKitFile(event, filePath)

								#
								# Stylus
								#

								else if ext is '.styl'
									# It’s a stylus file
									verbose 'Styles changed: ' + filePath 

									if event is 'build'
										# Just compile this current file
										compileStylusFile(event, filePath)
									else					
										# We need to compile this (for pages that use the old way.)
										basePathOfSourceFolderRegExp = /.*?\/source\//
										matches = filePath.match(basePathOfSourceFolderRegExp)

										if matches == null
											log 'WARNING: Source folder not found in changed Stylus path ('+filePath+'). This should never happen. Not compiling.'
										else
											#
											# Compile the main stylus file and the current stylus file…
											#
											basePathOfSourceFolder = matches[0]
											mainStylusFile = basePathOfSourceFolder + '/assets/stylus/style.styl'

											compileStylusFile(event, mainStylusFile).then ->
												#
												# …And then compile the style file itself
												# (To handle pages that do it the new, better encapsulated way)
												#
												compileStylusFile(event, filePath)

								#
								# Image files
								# Disabling SVG for now as it messes up some SVG files
								# TODO: File a bug with ImageMagick
								# (e.g., Pulse logo)
								# 

								else if (ext is '.jpg') or (ext is '.jpeg') or (ext is '.png') or (ext is '.gif') #or (ext is '.svg')
									verbose 'Image changed: ' + filePath
									compileImageFile(event, filePath)

								#
								# Catchall: simply copy the file over.
								#

								else
									copyFile event, filePath

			#
			# If file is moved to trash, actually remove it.
			# (This will trigger a delete and we can actually respond to that 
			# to really delete the file from the build.)
			#
			# Note: written for the behaviour of and only tested on OS X. 
			#
			else if event is 'trashed'
				log 'File moved to trash: ' + filePath
				deleteFile filePath
	


######################################################################
#
# 	Build methods
#
######################################################################

crypto = require 'crypto'

#
# Calculate checksum
#
checksum = (str) ->
    return crypto
        .createHash('md5')
        .update(str, 'utf8')
        .digest('hex')


#
# Clean build folder.
#
cleanBuildFolder = ->
	fs.removeAsync 'build/'	


#
# Build the entire site
#

buildSite = (options) ->

	# cleanBuildFolder().then ->
 	# stopBuildServer()

	globPattern = 'source/**/*'
	
	globAsync(globPattern, {})
		.then (files) =>
			#
			# Create the progress bar and then pass through the files to the iterator.
			#
			totalTicksOnProgressBar = files.length

			progressBar = new ProgressBar(':bar (:percent)', {
				total: totalTicksOnProgressBar,
				incomplete: '◦',
				complete: '●'
			})

			return files
		.each (file) =>
			#
			# Process each source file
			#

			filePath = process.cwd() + '/' + file

			# 
			# During a build, only process changed files so we’re not unnecessarily
			# rebuilding any assets
			#

			cachePath = filePath.replace 'source', '.cache/site'
			# log 'Checking cache for file: ' + cachePath

			skipCache = false
			pathExtension = path.extname(cachePath)			
			if options == 'partials'
				skipCache = pathExtension == '.html' || pathExtension == '.styl'
			else if options != undefined
				skipCache = pathExtension == options
			
			# if skipCache
			# 	console.log 'Skipping cache for ' + pathExtension + '.'

			fsExistsAsync(cachePath).then (exists) ->
				if exists && !skipCache
					fs.statAsync(filePath).then (stats) ->
						if stats.isFile()
							fs.readFileAsync(cachePath).then (cacheMD5) ->
								fs.readFileAsync(filePath).then (currentFileContents) ->
									currentFileMD5 = checksum(currentFileContents)

									# log '  Cache MD5: ' + cacheMD5
									# log 'Current MD5: ' + currentFileMD5

									if cacheMD5.toString() == currentFileMD5.toString()
										# log 'Files are the same.'
										progressBar.tick({title: 'Unchanged: ' + file})
										return
									else  
										# log 'File has changed, processing…'
										processSourceFile('build', filePath).then ->
											progressBar.tick({title: file})
						else
							# log 'This is a folder, skipping…'
							progressBar.tick({title: 'Folder: ' + file})
				else
					# log 'No cache file found, processing…'
					processSourceFile('build', filePath).then ->
						progressBar.tick({title: file})
		.then =>
			message = '\n' + (chalk.green.inverse 'Build complete.') + '\n'
			log message
		.catch ((e)->
			console.log 'Error: ' + e
		)


######################################################################
#
# Compilers
#
# All compilers return a promise to compile a passed file.
#
# TODO: Not sure if the event is really necessary.
#
######################################################################

compilers =
	'copy': copyFile,
	'kit': compileKitFile,
	'image': compileImageFile,
	'stylus': compileStylusFile,
	'delete': deleteFile

#
# Deletes a file.
# (With special handling for stylus files as per the site legacy.)
#

deleteFile = (filePath) ->
	outputFilePath = getOutputPath filePath
	ext = path.extname filePath

	if ext is '.styl'
		outputFilePath = outputFilePath.replace('stylus', 'css')

	fs.removeAsync outputFilePath
		.then ->
			log 'Deleted file from trash ' + outputFilePath


#
# Copies a file or directory.
#

copyFile = (event, filePath) ->
	outputFilePath = getOutputPath(filePath)

	if !program.dryRun
		return fs.copyAsync(filePath, outputFilePath)
	else
		log 'Dry run: copy ' + filePath + ' to ' + outputFilePath
		# Return a fulfilled promise
		return Promise.cast()


#
# Compiles an image file using ImageMin.
#

compileImageFile = (event, filePath) ->	

	outputFilePath = getOutputPath(filePath)

	if !program.dryRun
		return fs.ensureFileAsync(outputFilePath).then( ->
			# OK, actually do the image minification.
			imageMin = new Imagemin()
				.use(Imagemin.jpegtran())
				.src(filePath)
				.dest(path.dirname(outputFilePath))

			ext = path.extname filePath

			if ext is '.jpg' or ext is '.jpeg'
				verbose 'Compressing JPG'
				imageMin.use Imagemin.jpegtran()
			else if ext is '.png'
				verbose 'Compressing PNG'
				imageMin.use Imagemin.optipng()
			else if ext is '.gif'
				verbose 'Compressing GIF'
				imageMin.use Imagemin.gifsicle()
			else if ext is '.svg'
				verbose 'Compressing SVG'
				imageMin.use Imagemin.svgo()

			imageMin
				.optimizeAsync()
				.then((file) ->
	 				logCompileMessage(event, filePath)
	 			)
		)
	else
		log 'Dry run: imagemin: ' + filePath
		return Promise.cast()


#
# Compiles a Kit file (.html) -> to HTML (.html)
#

compileKitFile = (event, filePath) ->
	#
	# Note: node-kit chokes if file name has spaces: can’t parse input file; creates empty output file.
	#
	return kitAsync(filePath)
		.then (html) ->
			return writeFileAsync event, filePath, '', '', '', '', html
		.catch ((e) ->
			log (chalk.yellow.inverse 'Kit error: ') + e
		)


#
# Compiles Stylus file (.styl) -> to CSS (.css)
#

compileStylusFile = (event, filePath) ->
	return stylus.renderFile(filePath)
		# .catch(console.error.bind(console))
		.catch ((e) ->
			log (chalk.red.inverse 'Stylus error: ') + e
		)
		.then((css) -> 
			writeFileAsync event, filePath, 'stylus', 'css', '.styl', '.css', css
		)


######################################################################
#
# Compiler helpers
#
######################################################################

#
# Translates a path from source/… to build/…
#

getOutputPath = (filePath) ->
	return filePath.replace('source', 'build')


#
# Write a compiled file to the build folder, changing its folder name and and the file extension.
#

writeFileAsync = (event, filePath, oldFolder, newFolder, oldExtension, newExtension, content) ->
	# log 'FROM: ' + filePath

	outputFilePath = filePath.replace 'source', 'build'
	outputFilePath = outputFilePath.replace oldFolder, newFolder
	outputFilePath = outputFilePath.replace oldExtension, newExtension

	# log 'TO: ' + outputFilePath
	# log 'CONTENT: ' + content

	if !program.dryRun
		fs.ensureFileAsync(outputFilePath).then( ->
			fs.writeFileAsync(outputFilePath, content).then( ->
				logCompileMessage(event, filePath)
			)
		)
	else
		log 'Dry run: compiled ' + outputFilePath
		return Promise.cast()


######################################################################
#
# Deployment
#
# 1. Rsyncs the build folder to the public folder.
# 2. Makes deployment-time string replacements in the public folder.
# 3. Rsyncs the public folder to static.ind.ie via ssh.
#
# Unless you are using your default SSH identity and/or if your
# username differs between your development machine and the
# deployment machine, you can create two configuration files:
#
# ssh-user: holds your username on the development machine e.g.,
#
# laura
#
# ssh-public-key-path: holds the path to your public key. e.g.,
#
# ~/.ssh/id_rsa2
#
#
######################################################################

#
# Deploy
#

deploy = ->
	log '\nDeploying site…\n'


	deployAsync()
		.then ->
			#
			# Replace necessary strings.
			#
			makeDeploymentStringReplacements(). then ->
				# console.log 'Made deployment string replacements.\n\n'
				return
		.then ->
			#
			# Deploy to server via rsync.
			#

			# Read the shell command from the ssh config file.
			fs.readFileAsync path.join process.cwd(), 'ssh-user'
				.then (sshUser) ->
					fs.readFileAsync path.join process.cwd(), 'ssh-public-key-path'
						.then (sshPublicKeyPath) ->

							user = if (sshUser.length == 0) then '' else "#{sshUser}@"
							sshPublicKeyPath = if (sshPublicKeyPath.length == 0) then '' else " -i #{sshPublicKeyPath}"

							rsync = new Rsync()
								.shell("ssh" + sshPublicKeyPath)
								.flags('rsync-path="sudo /usr/bin/rsync"', 'v', 'r', 'c', 'progress', 'delete', 'chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r')
								# .exclude(['.*/'])
								.source(process.cwd() + '/public/')
								.destination("#{user}static.ind.ie:/var/www/")
								# .flags('delete')
								# .dry()
								.output (data) ->
									console.log data.toString()
								, (data) ->
									console.log data.toString()

							# log rsync.command()

							return new Promise ((fulfill, reject) ->
								# console.log "New promise!"
								# console.log rsync
								rsync.execute (error, code, cmd) =>
									
									if error
										errorMessage = (chalk.red.inverse 'Error in rsync: ') + error + '. ' + cmd
										reject errorMessage
									else
										# Rsync complete.
										# console.log "Rsync to server complete."
										fulfill()
							)
		.then ->
			log '\n' + (chalk.green.inverse 'Site deployed.' ) + '\n\nhttps://ind.ie\n'
		.catch Promise.OperationalError, (e) =>
			log 'Operational error: ' + e.message
		.catch ((e) ->
			log (chalk.red.inverse e) + '\n'
		)

deployAsync = ->
	rsync = new Rsync()
		.flags('v','a','z', 'delete')
		# .exclude(['.*/'])
		.source(process.cwd() + '/build/')
		.destination(process.cwd() + '/public/')
		# .dry()

	# log rsync.command()

	return new Promise ((fulfill, reject) ->
		rsync.execute (error, code, cmd) =>
			if error
				errorMessage = (chalk.red.inverse 'Error in rsync: ') + code + '. ' + cmd
				reject errorMessage
			else
				# console.log 'Rsync build to public folder complete.'
				fulfill()
	)

######################################################################
#
# General command parser (uses Commander’s parser so we have a single
# parser for both command line arguments and the REPL).
#
######################################################################

parseCommand = (commandString) ->
	commandString = commandString.trim()	# Remove any extra spaces

	# Create an array as would argv so we can use Commander’s parser 
	# (so we don’t create redundancy in parsing commands)
	# Regex courtesy of http://stackoverflow.com/questions/13796594/how-to-split-string-into-arguments-and-options-in-javascript#comment21935456_13796877
	commandArray = commandString.match(/('(\\'|[^'])*'|"(\\"|[^"])*"|\/(\\\/|[^\/])*\/|(\\ |[^ ])+|[\w-]+)/g)

	# Hack: Add a dummy process name and path to make it look exactly like an argv array 
	# for Commander (who will splice out the first two elements anyway)
	commandArray = ['Ind.ie Site', 'cli'].concat commandArray

	# Get Commander to parse the commandArray and fire off a comand if necessary.
	program.parse commandArray


# Start the REPL if site was called without any command-line arguments

if process.argv.length == 2 || (process.argv.length == 3 && program.dryRun)
	repl = require 'tidy-prompt'
	repl.setInPrompt('')
	repl.start()
	repl
		.on 'input', (command) ->
			if command
				parseCommand(command)

		.on 'SIGINT', ->
			log ('Ctrl+C: Goodbye!')
			return process.exit(0)

	# Display information on the current git repository
	
	welcomeMessage = '\n' \
	+ chalk.blue('Ind.ie Site Builder version ' + program.version() + ' by Aral Balkan. ') \
	+ chalk.inverse('Type help for assistance.') \
	+ '\n'

	# Update the prompt
	updatePrompt().then ->
		if program.dryRun
			welcomeMessage += '\n*** This is a dry run. No actual changes will be made. ***\n'

		log welcomeMessage
else
	# Goodbye!
	process.exit(0)


######################################################################
#
# Build server
#
######################################################################

livereload = require('express-livereload')

buildServer = null
buildServerDaemon = null
createBuildServer = ->
	buildServer = new Express()
	buildServer.use Express.static 'build/'
	livereload(buildServer, config={watchDir: 'build/'})

	buildServer.use (require('connect-livereload')({
	    port: 35729
	  }));
	startBuildServer()

stopBuildServer = ->
	log 'Stopping build server…'
	buildServerDaemon.close()

startBuildServer = ->
	buildServerDaemon = buildServer.listen 8000, ->
		log 'Build server active at http://localhost:' + buildServerDaemon.address().port


######################################################################
#
# Public server
# 
######################################################################

publicServer = null
publicServerDaemon = null
createPublicServer = ->
	publicServer = new Express()
	publicServer.use Express.static 'public/'
	publicServerDaemon = publicServer.listen 8001, ->
		log 'Public server active at http://localhost:' + publicServerDaemon.address().port


######################################################################
#
# Start
#
######################################################################

# Check if the .cache folder exists and, if not, create it.
fsExistsAsync('.cache/site').then (exists) ->
	if exists
		boot()
	else
		fs.mkdirAsync('.cache').then =>
			fs.mkdirAsync('site').then =>
				boot()

boot = ->

	# Parse any command line arguments
	program
		.parse process.argv

	buildSite().then ->

		# Let’s start watching for source file changes.
		startWatchingForSourceFileChanges()

		createBuildServer()

		createPublicServer()