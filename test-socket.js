const io = require('socket.io-client');
const axios = require('axios');

async function test() {
  try {
    // 1. Register a test user
    const email = `test${Date.now()}@test.com`;
    let res = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test',
      email,
      password: 'password123'
    });
    const token = res.data.token;

    // 2. Create a board
    res = await axios.post('http://localhost:5000/api/boards', { title: 'Test Board' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const boardId = res.data._id;

    // 3. Connect Socket
    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      
      socket.emit('joinBoard', boardId);
      
      // 4. Create List via socket
      socket.emit('listOperation', {
        type: 'LIST_CREATE', boardId, payload: { title: 'Test List' }
      }, (ack) => {
        console.log('listOperation ack:', ack);
        const listId = ack.result._id;
        
        // 5. Create Card via socket
        console.log('Emitting cardOperation...');
        socket.emit('cardOperation', {
          type: 'CARD_CREATE', boardId, payload: { title: 'Test Card', listId, boardId }, clientTimestamp: Date.now()
        }, (cardAck) => {
          console.log('cardOperation ack:', cardAck);
          process.exit(0);
        });
      });
    });
    
    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });

  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}

test();
