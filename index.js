const express = require('express');
const app = express();
const http = require('http');
const questions = require("./questions.json");
const server = http.createServer(app);
const io = require("socket.io")(server, {
	cors: {
	  origin: '*',
	}
  });;
const client_socketidmap = new Map();
const room_socketidmap = new Map();
const room_questionmap = new Map();
const client_scoremap = new Map();
var userName;
var roomNo;

app.get('/', (req, res) => {
  console.log(req.query + __dirname);
  
  userName = req.query['userName'];
  roomNo = req.query['room'];
  const url = __dirname + '/index.html';
 
  console.log('client connected with user name ' + userName + ' room ' + roomNo);	

  res.sendFile(url);
});

app.get('/ServerStart', (req, res) => {
  userName = 'SERVER';
  roomNo = 'NA';
  res.sendFile(__dirname + '/indexServer.html');
});

const port = process.env.port || 8080;

server.listen(port, () => {
  console.log('listening on *:80');
});

 io.on('connection', (socket) => {

	roomNo = socket.request._query.room;	
	userName =  socket.request._query.userName;
  
	if(!client_socketidmap.has(socket.id)) {
	client_socketidmap.set(socket.id, {'userName' : userName ,'roomNo':roomNo });
	console.log('client connected with socketid: ' + socket.id + ' ' + userName + ' ' + roomNo);	
	console.log(client_socketidmap);
	
	if(roomNo) {
		if(!room_socketidmap.has(roomNo))
		{
			room_socketidmap.set(roomNo, [socket.id]); 
		} else {
			room_socketidmap.get(roomNo).push(socket.id);	
		}
		console.log(room_socketidmap);
	}

	const socketids = room_socketidmap.get(roomNo);
	if(socketids) {
		socketids.forEach((socketid) => 
			io.to(socketid).emit('connected', getUsers(roomNo))
		);
	}
}

	function getUsers(roomNo) {
		let users =[];
		const socketids = room_socketidmap.get(roomNo);
		socketids.forEach(socketid => {
			if(client_socketidmap.get(socketid) && users.indexOf(client_socketidmap.get(socketid) < 0)){
				users.push(client_socketidmap.get(socketid).userName);
			}
		})
		return users;
	}
  
   socket.on('message', (msg) => {
	//only room filter
	var temproom = client_socketidmap.get(socket.id).roomNo;
	const socketids = room_socketidmap.get(temproom);
	
    console.log('message: ' + msg + ' '+  client_socketidmap.get(socket.id).userName + ' should go to ' +temproom + 'room and ' + socketids);
	
	socketids.forEach((socketid) => 
		io.to(socketid).emit('message',client_socketidmap.get(socket.id).userName + ' : ' + msg)
	);
	
  });

  socket.on('join', (userName, roomNo) => {  
	if(!client_socketidmap.has(socket.id)) {
		client_socketidmap.set(socket.id, {'userName' : userName ,'roomNo':roomNo });
		console.log('client joined with socketid: ' + socket.id + ' ' + userName + ' ' + roomNo);	
		console.log(client_socketidmap);
		
		if(roomNo) {
			if(!room_socketidmap.has(roomNo))
			{
				room_socketidmap.set(roomNo, [socket.id]); 
			} else {
				room_socketidmap.get(roomNo).push(socket.id);	
			}
			console.log(room_socketidmap);
		}
	
		const socketids = room_socketidmap.get(roomNo);
		if(socketids) {
			socketids.forEach((socketid) => 
				io.to(socketid).emit('connected', getUsers(roomNo))
			);
		}
	
  }});
  
 
  socket.on('question', (question, roomNo, answer) => {
	//only room filter
	console.log(question);
	console.log(roomNo);
	
	const socketids = room_socketidmap.get(roomNo);
	//setting question map per room  to track question - answers from participants
	room_questionmap.set(roomNo, {'question':question,'answer':answer});
    console.log('question: ' + question +' from '+  client_socketidmap.get(socket.id).userName + ' for room '+ roomNo + socketids);
	
	socketids && socketids.forEach((socketid) => 
		io.to(socketid).emit('question', client_socketidmap.get(socket.id).userName + ' : ' + question)
	);
  });
  
  socket.on('answer', (id, answer) => {
    console.log('answer: ' + answer +' '+  client_socketidmap.get(socket.id).userName);
	//only server filter
	const socketids = room_socketidmap.get('NA');
	var roomNo = client_socketidmap.get(socket.id).roomNo;
	
	
	if(!client_scoremap.has(client_socketidmap.get(socket.id).userName)){
	   client_scoremap.set(client_socketidmap.get(socket.id).userName, 0);
	}

	if(questions._items[id].answers.indexOf(answer.trim()) >= 0) {
		client_scoremap.set(client_socketidmap.get(socket.id).userName, client_scoremap.get(client_socketidmap.get(socket.id).userName) + 10 || 10);
		io.to(socket.id).emit('response', id, true, client_scoremap.get(client_socketidmap.get(socket.id).userName));
	} else {
		io.to(socket.id).emit('response', id, false, client_scoremap.get(client_socketidmap.get(socket.id).userName));
	}
	console.log(client_scoremap);
  });
  
  socket.on('sendscorecard', (roomNo) => {
    console.log('sendscorecard: ');
	console.log(client_scoremap);
	
	var client_scoremapjson = JSON.stringify(Object.fromEntries(client_scoremap));

	const socketids = room_socketidmap.get(roomNo);
	socketids && socketids.forEach((socketid) => 
		io.to(socketid).emit('message', 'Scorecard for room ' + roomNo + ' : ' + client_scoremapjson )
	);
	
	const clientsocketids = room_socketidmap.get(roomNo);
	clientsocketids && clientsocketids.forEach((socketid) => 
		io.to(socketid).emit('message', 'Scorecard for room ' + roomNo + ' : ' + client_scoremapjson )
	);
  });
  
  socket.on('startgame', async (roomNo) => {
    console.log('startgame command received from server');
	var roomNo = client_socketidmap.get(socket.id).roomNo;
	console.log(client_socketidmap.get(socket.id).userName + 'Please start Game for this : room: '+ roomNo);
	const socketids = room_socketidmap.get(roomNo);
	socketids && socketids.forEach((socketid) => 
			io.to(socketid).emit('gamestarted', true )
		);
	startGame(roomNo);
	//socket.emit('sendscorecard',roomNoStartGame.value);
  });

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  async function startGame(roomNo) {
	const socketids = room_socketidmap.get(roomNo);
	if (roomNo) {
		await delay(2000);
		for (let  i = 0 ; i < questions._items.length; i++){
			socketids && socketids.forEach((socketid) => 
				io.to(socketid).emit('question',i+". "+ questions._items[i].question , i)
			);
			await delay(10000);
		}
		var client_scoremapjson = JSON.stringify(Object.fromEntries(client_scoremap));
		socketids && socketids.forEach((socketid) => 
			io.to(socketid).emit('scorecard', client_scoremapjson )
		);
		const clientsocketids = room_socketidmap.get(roomNo);
        
    	clientsocketids.forEach((socketid) =>{
        if(client_socketidmap.get(socketid).userName){
            client_scoremap.delete(client_socketidmap.get(socketid).userName);
        }}
    );
	}
};

  socket.on('disconnect', () => {
	var deleteroomno =  client_socketidmap.get(socket.id).roomNo;
	
	console.log('delete room member' + deleteroomno);
	console.log(room_socketidmap.get(deleteroomno));
	
	if(deleteroomno && room_socketidmap.get(deleteroomno)){
	   const array = room_socketidmap.get(deleteroomno).filter(item => item !== socket.id);
	   room_socketidmap.set(deleteroomno, array);
	}
	
	client_socketidmap.delete(socket.id);
	console.log('user disconnected' + ' ' + userName + ' ' + roomNo + ' ' + socket.id );
  });
});