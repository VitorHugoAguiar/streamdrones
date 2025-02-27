module.exports = function (io, streams, db) {
  const bcrypt = require('bcrypt');
  const jwt = require('jsonwebtoken');
  const SECRET_KEY = '987654321';

  io.on('connection', (client) => {
    console.log(`-- ${client.id} joined --`);
    client.emit('id', client.id);

    client.on('message', (details) => {
      const otherClient = io.sockets.connected[details.to];
      if (!otherClient) {
        return;
      }
      delete details.to;
      details.from = client.id;
      otherClient.emit('message', details);
    });

    client.on('readyToStream', (options) => {
      console.log(`-- ${client.id} is ready to stream --`);
      const streamList = streams.getStreams();
      const streamExists = streamList.some(stream => stream.name === options.name);
      if (streamExists) {
        client.disconnect();
        return;
      } else {
        streams.addStream(client.id, options.name, options.pilot);
        io.emit('streamUpdate', { message: 'New stream available' });
      }
    });

    client.on('auth', async (credentials) => {
      const identifier = credentials.email;
      const isEmail = identifier.includes('@');
      const field = isEmail ? 'email' : 'name';
      const sql = `SELECT * FROM users WHERE ${field} = ? LIMIT 1`;
      
      db.query(sql, [identifier], async (error, results) => {
        if (error) {
          client.emit('authResponse', { success: false, message: 'Database error' });
          return;
        }
        if (!results || results.length === 0) {
          client.emit('authResponse', { success: false, message: 'Invalid credentials' });
          return;
        }
        
        const user = results[0];
        const match = await bcrypt.compare(credentials.password, user.password);
        if (match) {
          // Create tokens
          const accessToken = jwt.sign({ id: user.id, name: user.name }, SECRET_KEY, { expiresIn: '1d' });
          const refreshToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '7d' });
          
          // Query the user's force from user_forces table
          const forceSql = `SELECT force_id FROM users_forces WHERE user_id = ? LIMIT 1`;
          db.query(forceSql, [user.id], (forceError, forceResults) => {
            if (forceError || !forceResults || forceResults.length === 0) {
              // No force found; send empty drones array
              client.emit('authResponse', {
                success: true,
                message: 'Logged in!',
                user: { name: user.name },
                token: accessToken,
                refreshToken: refreshToken,
                expiresAt: Math.floor(Date.now() / 1000) + 3600,
                drones: []
              });
            } else {
              const forceId = forceResults[0].force_id;
              // Query the drones associated with this force from forces_drones table.
              // We're using the serial_number as the drone identifier.
              const dronesSql = `SELECT serial_number FROM forces_drones WHERE force_id = ?`;
              db.query(dronesSql, [forceId], (dronesError, dronesResults) => {
                let drones = [];
                if (!dronesError && dronesResults && dronesResults.length > 0) {
                  drones = dronesResults.map(row => row.serial_number);
                }
                console.log("Drones for user", user.id, ":", drones);
                client.emit('authResponse', {
                  success: true,
                  message: 'Logged in!',
                  user: { name: user.name },
                  token: accessToken,
                  refreshToken: refreshToken,
                  expiresAt: Math.floor(Date.now() / 1000) + 3600,
                  drones: drones
                });
              });
            }
          });
        } else {
          client.emit('authResponse', { success: false, message: 'Wrong password' });
        }
      });
    });
    
    

    client.on('validateToken', (token, callback) => {
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (typeof callback === "function") {
          callback({ valid: true, user: decoded });
        }
      } catch (err) {
        if (typeof callback === "function") {
          callback({ valid: false, message: "Invalid or expired token" });
        }
      }
    });



    client.on('getDrones', (options) => {
      console.log(`-- ${client.id} requested drones for category: ${options.name} --`);
    
      // Ensure the client sends both category and pilot information
      if (!options.name || !options.pilot) {
        client.emit("getDronesResponse", { 
          success: false, 
          message: "Category and pilot are required." 
        });
        return;
      }
    
      // Normalize inputs
      const category = options.name.trim().toUpperCase();  // e.g. "ALFA_INT"
      const pilot = options.pilot.trim();
    
      // Get active streams for comparison
      const streamList = streams.getStreams();
      console.log("Current streams:", streamList);
    
      // 1. Get the user ID for the given pilot name
      const userSql = `SELECT id FROM users WHERE name = ? LIMIT 1`;
      db.query(userSql, [pilot], (userErr, userResults) => {
        if (userErr || !userResults || userResults.length === 0) {
          console.log("User not found for pilot", pilot);
          client.emit("getDronesResponse", { success: false, message: "Pilot not found." });
          return;
        }
        const userId = userResults[0].id;
    
        // 2. Get the force for that user from user_forces table
        const forceSql = `SELECT force_id FROM user_forces WHERE user_id = ? LIMIT 1`;
        db.query(forceSql, [userId], (forceErr, forceResults) => {
          if (forceErr || !forceResults || forceResults.length === 0) {
            console.log("Force not found for user", userId);
            client.emit("getDronesResponse", { success: false, message: "Force not found." });
            return;
          }
          const forceId = forceResults[0].force_id;
    
          // 3. Get all potential drone IDs from forces_drones for that force.
          // We assume the serial_number field holds values like "ALFA_INT-COM001", "ALFA_EXT-COM001", etc.
          // We filter by category using a LIKE pattern.
          const pattern = category + '-%';  // e.g. "ALFA_INT-%"
          const dronesSql = `SELECT serial_number FROM forces_drones WHERE force_id = ? AND serial_number LIKE ?`;
          db.query(dronesSql, [forceId, pattern], (droneErr, droneResults) => {
            if (droneErr) {
              console.log("Error fetching drones for force", forceId, droneErr);
              client.emit("getDronesResponse", { success: false, message: "Error fetching drones." });
              return;
            }
            // Build an array of potential drone IDs from the database (normalized to uppercase)
            let potentialDroneIDs = [];
            if (droneResults && droneResults.length > 0) {
              potentialDroneIDs = droneResults.map(row => row.serial_number.toUpperCase().trim());
            }
            console.log("Potential drone IDs from DB:", potentialDroneIDs);
    
            // 4. Filter out any drone IDs already in use.
            let availableDrones = [];
            potentialDroneIDs.forEach(droneId => {
              const expectedName = droneId.toLowerCase();  // our active stream names are compared in lowercase
              const exists = streamList.some(stream => stream.name.toLowerCase().trim() === expectedName);
              if (!exists) {
                availableDrones.push(droneId);
              }
            });
            console.log("Available drones:", availableDrones);
    
            if (availableDrones.length > 0) {
              client.emit("getDronesResponse", { 
                success: true, 
                available: availableDrones 
              });
            } else {
              client.emit("getDronesResponse", { 
                success: false, 
                message: "No drones available for this category." 
              });
            }
          });
        });
      });
    });
    
    
    client.on('update', (options) => {
      streams.update(client.id, options.name, options.pilot);
      io.emit('streamUpdate', { id: client.id, name: options.name });
    });

    client.on('requestData', () => {
      const serverSendTime = Date.now();
      client.emit('sendPayload', { serverSendTime });
    });

    client.on('uploadData', (options) => {
      const serverReceiveTime = Date.now();
      const { payload, serverSendTime } = options;

      if (serverSendTime > serverReceiveTime) {
        console.error(`-- ${client.id}: Server send time is greater than receive time, timing error detected.`);
        return;
      }

      const duration = serverReceiveTime - serverSendTime;
      const latency = duration / 2;
      const payloadSizeBytes = Buffer.byteLength(payload, 'utf-8');
      const payloadSizeBits = payloadSizeBytes * 8;

      if (duration <= 0) {
        console.error(`-- ${client.id}: Duration is zero or negative, cannot calculate bandwidth. --`);
        return;
      }

      const bandwidth = (payloadSizeBits / (latency / 1000)) / (1024 * 1024);
      console.log(`bandwidth: ${bandwidth} MBps, latency: ${latency} ms`);
      client.emit('result', { bandwidth, latency });
    });

    const leave = () => {
      console.log(`-- ${client.id} left --`);
      streams.removeStream(client.id);
      io.emit('streamUpdate', { message: 'Stream removed' });
    };

    client.on('disconnect', leave);
    client.on('leave', leave);
  });
};
