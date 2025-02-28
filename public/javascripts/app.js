(function () {
	var app = angular.module('sentinela-stream', [], function ($locationProvider) { $locationProvider.html5Mode(true); });
	var client = new PeerManager();
	var previousData = [];
	var alertQueue = [];
	var isAlertShowing = false;
	var enableAlert = false;

    app.factory('WebSocketService', ['$rootScope', function ($rootScope) {
        var socket = io.connect('/');

		return {
            on: function (eventName, callback) {
                socket.on(eventName, function () {
                    var args = arguments;
                    $rootScope.$apply(function () {
                        callback.apply(socket, args);
                    });
                });
            },

			send: function (eventName, data) {
				socket.emit(eventName, data);
			}
        };
    }]);


	app.controller('RemoteStreamsController', ['$scope', '$location', '$http', 'WebSocketService', '$timeout', function ($scope, $location, $http, WebSocketService, $timeout) {
		var rtc = this;
		rtc.remoteStreams = [];

		// Example function call within a method
		rtc.callExternalFunction = function() {
			if (typeof window.indexFunctions === "function") {
				window.indexFunctions(); // Call the function from index.js
			}
		};


		$scope.categories = ['Alfa Interior', 'Alfa Exterior', 'Bravo']; // Example categories

		// Retrieve selected categories from localStorage or default to ['All']
		$scope.selectedCategories = JSON.parse(localStorage.getItem('selectedCategories')) || ['All'];

		// Function to toggle category selection
		$scope.toggleCategory = function (category) {
			// Prevent deselecting the last option
			if ($scope.selectedCategories.length === 1 && $scope.selectedCategories.includes(category)) {
				//console.log("At least one category must be selected.");
				return; // Exit the function
			}
			if (category === 'All') {
				if ($scope.selectedCategories.includes('All')) {
					$scope.selectedCategories = ['Alfa Interior'];
				} else {
					$scope.selectedCategories = ['All'].concat($scope.categories);
				}
			} else {
				var index = $scope.selectedCategories.indexOf(category);
				if (index > -1) {
					$scope.selectedCategories.splice(index, 1);
				} else {
					$scope.selectedCategories.push(category);
					if ($scope.categories.every(cat => $scope.selectedCategories.includes(cat))) {
						$scope.selectedCategories.push('All');
					}
				}
				if ($scope.selectedCategories.includes('All') && !$scope.categories.every(cat => $scope.selectedCategories.includes(cat))) {
					$scope.selectedCategories.splice($scope.selectedCategories.indexOf('All'), 1);
				}
			}

			// Save the selected categories to localStorage
			localStorage.setItem('selectedCategories', JSON.stringify($scope.selectedCategories));
			//console.log("Selected Categories:", $scope.selectedCategories);
		};

		// Optionally, create a watcher on selectedCategories to save changes automatically
		$scope.$watch('selectedCategories', function (newValue, oldValue) {
			if (newValue !== oldValue) {
				localStorage.setItem('selectedCategories', JSON.stringify(newValue));
			}
		}, true);

		// Listen for stream updates
		WebSocketService.on('streamUpdate', function (message) {
			//console.log(message); // Log the message for debugging purposes
			rtc.loadData(message);
		});

		function getStreamById(id) {
			for (var i = 0; i < rtc.remoteStreams.length; i++) {
				if (rtc.remoteStreams[i].id === id) {
					return rtc.remoteStreams[i];
				}
			}
		}

		function processData(newData) {
			var newDataFiltered = newData.filter(function (message) {
				return message.id !== client.getId();
			});

			// Compare newDataFiltered with previousData to find changes
			var addedElements = newDataFiltered.filter(newItem => !previousData.some(oldItem => newItem.id === oldItem.id));
			var removedElements = previousData.filter(oldItem => !newDataFiltered.some(newItem => newItem.id === oldItem.id));

			var updatedElements = newDataFiltered.filter(newItem => previousData.some(oldItem => newItem.id === oldItem.id && newItem.name !== oldItem.name));

			//console.log("previousData: " + previousData)
			//console.log("newDataFiltered: " + newDataFiltered)

			// Handle added elements
			addedElements.forEach(item => {
				//console.log("Added: " + item.name);
				if (enableAlert === true) {
					alertMessage(item.name + ' is Online', 'added');
				}
			});

			// Handle removed elements
			removedElements.forEach(item => {
				//console.log("Removed: " + item.name);
				if (enableAlert === true) {
					alertMessage(item.name + ' is Offline', 'removed');
				}
			});

			// Handle updated elements
			updatedElements.forEach(newItem => {
				if (enableAlert === true) {
					// Find the old item for comparison or additional context if necessary
					//const oldItem = previousData.find(oldItem => oldItem.id === newItem.id);
					//console.log("Updated from: " + (oldItem ? oldItem.name : 'Unknown') + " to: " + newItem.name);
					alertMessage(newItem.name + ' is Online', 'added');
				}
			});

			// Update previousData for the next check
			previousData = newDataFiltered;
		}

		function alertMessage(streamName, type) {
			// Determine the background color based on the type of alert
			const backgroundColor = type === "added" ? '#c2e76b' : '#f53513'; //CORES

			// Enqueue the alert
			alertQueue.push({ message: streamName, backgroundColor });

			// Display the alert if not already doing so
			if (!isAlertShowing) {
				displayNextAlert();
			}
		}

		function displayNextAlert() {
			if (alertQueue.length === 0) {
				isAlertShowing = false;
				return;
			}

			isAlertShowing = true;
			const { message, backgroundColor } = alertQueue.shift();

			// Select the message div and inner-message where the text will be displayed
			var messageDiv = document.getElementById('message');
			var innerMessageDiv = document.getElementById('inner-message');
			var alertCustom = document.querySelector('.alert-custom');

			// Update the alert's appearance
			innerMessageDiv.textContent = message; // Set the text
			alertCustom.style.backgroundColor = backgroundColor; // Set the color

			// Show the alert
			messageDiv.style.display = 'block';

			// Set the visibility toggle logic with intervals
			var isVisible = true;
			var flashCount = 0;
			var flashingInterval = setInterval(function () {
				isVisible = !isVisible;
				messageDiv.style.display = isVisible ? 'block' : 'none';
				flashCount++;

				if (flashCount >= 10) {
					clearInterval(flashingInterval);
					messageDiv.style.display = 'none'; // Ensure the message is hidden after flashing
					displayNextAlert(); // Proceed to display the next alert, if any
				}
			}, 500); // Flash every 500ms
		}


		function removeStreams() {
			var videoContainer = document.getElementById('video');
			var allVideoElements = videoContainer.querySelectorAll('video[data-stream-id]');
			allVideoElements.forEach(function(videoElement) {
				var streamId = videoElement.getAttribute('data-stream-id');
				var streamExists = rtc.remoteStreams.some(stream => stream.id === streamId);
		
				if (!streamExists) {
					console.log("Deactivating stream: " + streamId);
					var canvasElement = document.querySelector('#video canvas[data-stream-id="' + streamId + '"]');
					if (canvasElement) {
						videoElement.parentNode.removeChild(videoElement);
						canvasElement.parentNode.removeChild(canvasElement);
					}
				}
			});
		}

		
		// Function to load data from streams.json
		rtc.loadData = function(message = null) {
			$http.get('/streams.json').then(function (response) {

				var data = response.data;

				var streams = data.filter(function (stream) {
					return stream.id != client.getId();
				});

				// Update stream isPlaying status based on previously known state
				for (var i = 0; i < streams.length; i++) {
					var existingStream = getStreamById(streams[i].id);
					streams[i].isPlaying = existingStream ? existingStream.isPlaying : false;
				}
				rtc.remoteStreams = streams;

				processData(data);

				removeStreams();

				rtc.callExternalFunction();

				// Update text for the specific stream
				if (message && message.id) {
					client.updateText(message.id, message.name);
				}

				enableAlert = true;

				// Logic to check if video elements should be removed
				var videoContainer = document.getElementById('video');
				// Create a new div element for the placeholder
				var placeholder = document.createElement('div');


				if (videoContainer.children.length === 0) {
					// Style the placeholder to maintain responsiveness
					placeholder.style.width = '100%';
					placeholder.style.paddingTop = '56.25%'; // Maintain the aspect ratio (16:9)
					videoContainer.style.display = 'flex';
					// Assign a class to the placeholder div
					placeholder.className = 'videoBackground';
					videoContainer.appendChild(placeholder);
				}

			}, function (error) {
				console.error('Failed to fetch streams:', error);
			});
		};

		// Initial load
		rtc.loadData();

		rtc.view = function (stream) {
			stream.isPlaying = !stream.isPlaying; // Toggle the active state

			if (stream.isPlaying) {
				client.peerInit(stream.id, stream.name);
				stream.isPlaying = true;
				//updatePlayingStreamsInSession();
				//console.log("client.peerInit:", JSON.stringify(stream, null, 2));
				console.log("Stream Active: " + stream.id);

			} else {
				client.peerhangup(stream.id);
				//updatePlayingStreamsInSession();
				//console.log("client.peerhangup: ", JSON.stringify(stream, null, 2));
				
				var videoContainer = document.getElementById('video');
				var videoElement = document.querySelector('video[data-stream-id="' + stream.id + '"]');
				var placeholder = document.createElement('div');
				var canvasElement = document.querySelector('#video canvas');

				console.log("Deactivating stream: " + stream.id);
				if (canvasElement) {
					videoElement.parentNode.removeChild(videoElement);
					canvasElement.parentNode.removeChild(canvasElement);

					if (videoContainer.children.length === 0) {

						// Style the placeholder to maintain responsiveness
						placeholder.style.width = '100%';
						placeholder.style.paddingTop = '56.25%'; // Maintain the aspect ratio (16:9)

						// Assign a class to the placeholder div
						placeholder.className = 'videoBackground';
						videoContainer.appendChild(placeholder);
					}
				}


				// You can call this function as needed in your controller logic
				rtc.callExternalFunction();

				stream.isPlaying = false;
			}



		};

		if ($location.url() != '/') {
			rtc.call($location.url().slice(1));
		};
	}]);
})();
