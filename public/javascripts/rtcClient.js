var PeerManager = (function () {

  var localId,
    config = {
      peerConnectionConfig: {
        iceServers: [
          { "url": "stun:stun.l.google.com:19302" },
          { "url": "stun:stun01.sipphone.com" },
          { "url": "stun:stun.ekiga.net" },
          { "url": "stun:stun.softjoys.com" },
          { "url": "stun:stun.voiparound.com" },
          { "url": "stun:stun.voipbuster.com" },
          { "url": "stun:stun.voipstunt.com" },
          { "url": "stun:stun.voxgratia.org" },
          { "url": "stun:stun.xten.com" },

          {
            'url': 'turn:dronestream.arditi.pt:5000', //'urls': 'turn:dronestream.arditi.pt:5000', //turn:192.158.29.39:3478?transport=tcp,
            'credential': 'testpass', //'credential': 'testpass', //JZEOEt2V3Qb0y27GRntt2u2PAYA=
            'username': 'testname', //'username': 'testname', //28224511:1379330808
          }
        ]
      },
      peerConnectionConstraints: {
        optional: [
          { "DtlsSrtpKeyAgreement": true }
        ]
      }
    },
    peerDatabase = {};
  const socket = io();

  socket.on('id', function (id) {
    localId = id;
  });

  socket.on('message', handleMessage);
  // get model information



  function addPeer(remoteId, streamName) {
    var peer = new Peer(remoteId, streamName, config.peerConnectionConfig, config.peerConnectionConstraints);
    peer.pc.onicecandidate = function (event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };
    peer.pc.onaddstream = function (event) {
      attachMediaStream(peer.remoteVideoEl, event.stream);
      video.appendChild(peer.remoteVideoEl);
    };
    peer.pc.onremovestream = function (event) {
      peer.remoteVideoEl.src = '';
      video.removeChild(peer.remoteVideoEl);
    };
    peer.pc.oniceconnectionstatechange = function (event) {
      switch (
      (event.srcElement // Chrome
        || event.target) // Firefox
        .iceConnectionState) {
        case 'disconnected':
          break;
      }
    };
    peerDatabase[remoteId] = peer;


    return peer;
  }
  function answer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createAnswer(
      function (sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('answer', remoteId, sessionDescription);
      },
      error
    );
  }
  function offer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createOffer(
      function (sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('offer', remoteId, sessionDescription);
      },
      error
    );
  }
  function handleMessage(message) {
    var type = message.type,
      from = message.from,
      pc = (peerDatabase[from] || addPeer(from, message.streamName)).pc;

    //console.log('received ' + type + ' from ' + from);

    switch (type) {
      case 'init':
        toggleLocalStream(pc);
        offer(from);
        break;
      case 'offer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function () { }, error);
        answer(from);
        break;
      case 'answer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function () { }, error);
        break;
      case 'candidate':
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: message.payload.label,
            sdpMid: message.payload.id,
            candidate: message.payload.candidate
          }), function () { }, error);
        }
        break;
    }
  }
  function send(type, to, payload) {
    //console.log('sending ' + type + ' to ' + to);

    socket.emit('message', {
      to: to,
      type: type,
      payload: payload
    });
  }

  function error(err) {
    console.log(err);
  }

  return {
    getId: function () {
      return localId;
    },

    peerInit: function (remoteId, streamName) {
      peer = peerDatabase[remoteId] || addPeer(remoteId, streamName);
      send('init', remoteId, null);
    },

    peerRenegociate: function (remoteId) {
      offer(remoteId);
    },

    peerhangup: function (remoteId) {
      delete peerDatabase[remoteId];
      send('hangup', remoteId, null);
    },

    send: function (type, payload) {
      socket.emit(type, payload);
    },

    updateText: function (remoteId, newText) {
      let peer = peerDatabase[remoteId];
      if (peer) {
        peer.updateText(newText);
      }
    }

  };
});

var Peer = function (remoteId, streamName, pcConfig, pcConstraints) {
  this.pc = new RTCPeerConnection(pcConfig, pcConstraints);
  this.remoteId = remoteId;
  // Ensure streamName is a string
  this.streamName = typeof streamName === 'string' ? streamName : JSON.stringify(streamName);

  // Create the video element (hidden)
  this.remoteVideoEl = document.createElement('video');
  this.remoteVideoEl.setAttribute('data-stream-id', remoteId);
  this.remoteVideoEl.autoplay = true;
  this.remoteVideoEl.style.display = 'none'; // Hide the video element

  // Get the video container
  var videoContainer = document.getElementById('video');
  var placeholder = videoContainer.querySelector('.videoBackground');

  // Create a new canvas for this video
  var canvas = document.createElement('canvas');
  canvas.setAttribute('data-stream-id', remoteId);
  canvas.style.width = '100%'; // Set initial width to 100% to fit the container
  canvas.style.height = 'auto'; // Height will adjust automatically based on aspect ratio

  canvas.style.marginRight = '10px';
  canvas.style.display = 'inline-block';

  // Append the video and canvas to the container
  videoContainer.appendChild(this.remoteVideoEl);
  videoContainer.appendChild(canvas);

  var context = canvas.getContext('2d');

  // Update canvas size based on video metadata
  this.remoteVideoEl.onloadedmetadata = () => {
    this.remoteVideoEl.width = this.remoteVideoEl.videoWidth;
    this.remoteVideoEl.height = this.remoteVideoEl.videoHeight;
    canvas.width = 1280;
    canvas.height = 720; 
  };

  this.remoteVideoEl.oncanplaythrough = () => {
    // If the placeholder exists, remove it
    if (placeholder) {
      videoContainer.removeChild(placeholder);
    }
  };


  // Function to draw a rounded rectangle
  const drawRoundedRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
  };

  // Draw video frames onto the canvas
  const drawFrame = () => {
    if (this.remoteVideoEl.readyState >= this.remoteVideoEl.HAVE_CURRENT_DATA) {
      context.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
      context.drawImage(this.remoteVideoEl, 0, 0, canvas.width, canvas.height);

      // Scale text
      const text = this.streamName;
      const fontSize = canvas.width / 70; // Scale text size
      context.font = `${fontSize}px Arial`;

      // Measure text width and calculate rectangle dimensions
      const textMetrics = context.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent; // Accurate text height
      const padding = canvas.width / 140; // Padding around the text
      const radius = canvas.width / 140; // Radius for rounded corners

      // Rectangle dimensions
      const rectWidth = textWidth + padding * 2;
      const rectHeight = textHeight + padding * 2;
      const x = (canvas.width - rectWidth) / 2; // Center horizontally
      const y = padding; // Position at the top with padding

      // Draw the rounded rectangle
      context.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
      drawRoundedRect(context, x, y, rectWidth, rectHeight, radius);

      // Calculate the vertical position for the text
      const textX = x + padding;
      const textY = y + textMetrics.actualBoundingBoxAscent + padding; // Vertically center the text

      // Draw the text
      context.fillStyle = 'white'; // Text color
      context.fillText(text, textX, textY); // Center text position
    }
    requestAnimationFrame(drawFrame);
  };

  // Start drawing frames
  drawFrame();

  // Handle incoming streams
  this.pc.ontrack = (event) => {
    if (event.track.kind === 'video') {
      this.remoteVideoEl.srcObject = event.streams[0];
    }
  };

  // Method to update the text on the canvas
  this.updateText = (newText) => {
    this.streamName = newText;
    drawFrame();
  };
};

