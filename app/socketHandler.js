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

          // Query the user's force from users_forces table
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


    client.on('getDrones', (options) => {
      // Ensure options.name is provided and is an array
      if (!options.name || !Array.isArray(options.name)) {
        client.emit("getDronesResponse", { 
          success: false, 
          message: "Options.name must be an array of drone IDs." 
        });
        return;
      }
    
      console.log(`-- ${client.id} requested drones using options.name:`, options.name);
    
      // Get active streams for comparison
      const streamList = streams.getStreams();
      console.log("Active streams:", streamList);
    
      // Create a set of active drone names (normalized to uppercase and trimmed)
      const activeNames = new Set(streamList.map(stream => stream.name.toUpperCase().trim()));
      console.log("Active names:", activeNames);
    
      // Filter out any drone IDs in options.name that are already in use
      const available = options.name.filter(droneId => {
        return !activeNames.has(droneId.toUpperCase().trim());
      });
    
      console.log("Available drones:", available);
    
      if (available.length > 0) {
        client.emit("getDronesResponse", { 
          success: true, 
          available: available 
        });
      } else {
        client.emit("getDronesResponse", { 
          success: false, 
          message: "No drones available." 
        });
      }
    });
    
    

    client.on('update', (options) => {
      console.log("UPDATE:", client.id + " ", options.name + " ", options.pilot + " ");
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
