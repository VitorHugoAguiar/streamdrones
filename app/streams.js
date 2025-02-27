module.exports = function() {
  const moment = require('moment-timezone');
  /**
   * available streams 
   * the id value is considered unique (provided by socket.io)
   */

  function getCurrentDateTime() {
    const timezone = 'Atlantic/Madeira';
    
    // 'dddd' for full day name, 'DD-MM-YYYY' for date format
    const dayDate = moment().tz(timezone).format('dddd DD-MM-YYYY');
    
    // 'HH[h]mm[m]' for time format with hours and minutes
    const time = moment().tz(timezone).format('HH[h]mm[m]');
    
    return [dayDate, time];
  }

  var streamList = [];

  /**
   * Stream object
   */
  var Stream = function(id, name, pilot, dayDate, time) {
    this.name = name;
    this.id = id;
    this.pilot = pilot;
    this.dayDate = dayDate;
    this.time = time;
  }

  return {
    addStream : function(id, name, pilot) {
      const [dayDate, time] = getCurrentDateTime();
    
      // Check if a stream with the same name already exists
      var existingStream = streamList.find(function(element) {
        return element.id === id;
      });

      // If a stream with the same name exists, update its properties
      if(existingStream) {
        existingStream.id = id;
        existingStream.pilot = pilot;
        existingStream.dayDate = dayDate;
        existingStream.time = time;
      } else  {
        // Check if the stream list is at its maximum capacity
        if (streamList.length >= 4) {
          console.log("Stream limit reached. New stream not accepted.");
          return; // Exit without adding the new stream
        }
      
        
        // Create a new stream and add it to the list
        var stream = new Stream(id, name, pilot, dayDate, time); 
        streamList.push(stream);
      }
    },

    removeStream: function(id) {
      const index = streamList.findIndex((stream) => stream.id === id);
      
      if (index !== -1) {
        streamList.splice(index, 1);
        console.log(`Stream with ID ${id} removed.`);
      } else {
        console.log(`Stream with ID ${id} not found.`);
      }
    },
    

    // update function
    update: function(id, name, pilot) {
      var stream = streamList.find((element) => element.id == id);
      
      if (!stream) {
        console.log(`Stream with ID ${id} not found!`);
        return; // Exit if no stream found
      }
    
      const [dayDate, time] = getCurrentDateTime();
      stream.name = name;
      stream.pilot = pilot;
      stream.dayDate = dayDate;
      stream.time = time;
    },
    
    getStreams : function() {
      return streamList;
    }
  }
};
