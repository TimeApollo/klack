const express = require('express')
const querystring = require('querystring');
const mongoose = require('mongoose');

const dbName = 'klack';
const DB_USER = 'TimeApollo';
const DB_PASSWORD = 'Kenzie1';
const DB_URI = 'ds147411.mlab.com:47411'
const port = process.env.PORT||3000;
const app = express()

// List of all messages
let messages = []

// Track last active times for each sender
let users = {}

app.use(express.static("./public"))
app.use(express.json())

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: Number
})

const Message = mongoose.model("Message", messageSchema , 'messages');



// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
    var nameA = a.name.toUpperCase(); // ignore upper and lowercase
    var nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
  
    // names must be equal
    return 0;      
}

app.get("/messages", (request, response) => {
    // get the current time
    const now = Date.now();

    // consider users active if they have connected (GET or POST) in last 15 seconds
    const requireActiveSince = now - (15*1000)

    // reset message array to work with database
    messages = [];

    // make a list of all users from the database
    Message.find({} , ( err , messageCollection ) => {
      messageCollection.forEach( message => {
        messages.push(message)
        if( !users[message.sender] ) {
          users[message.sender] = message.timestamp;
        }else{
          if( message.timestamp > users[message.sender] ){
            console.log('here' , message.timestamp , users[message.sender] , message.sender)
            users[message.sender] = message.timestamp;
          }
        }
      })
      // console.log(users)
    
      // create a new list of users with a flag indicating whether they have been active recently
      usersSimple = Object.keys(users).map((x) => ({name: x, active: (users[x] > requireActiveSince)}))

      // sort the list of users alphabetically by name
      usersSimple.sort(userSortFn);
      usersSimple.filter((a) => (a.name !== request.query.for))

      // update the requesting user's last access time
      users[request.query.for] = now;
  
      // send the latest 40 messages and the full user list, annotated with active flags
      response.send({messages: messages.slice(-40), users: usersSimple})

    })
})

app.post("/messages", (request, response) => {
    // add a timestamp to each incoming message.
    const timestamp = Date.now()
    request.body.timestamp = timestamp

    console.log(request.body)

    // append the new message to the message list
    // messages.push(request.body)
    // console.log(messages)

    // make new Message from model
    let message = new Message({
      sender: request.body.sender,
      message: request.body.message,
      timestamp: timestamp
    })

    message.save(( err , data) => {
      if(err) return console.error(err)
    })

    console.log(message)

    // update the posting user's last access timestamp (so we know they are active)
    users[request.body.sender] = timestamp

    // Send back the successful response.
    response.status(201)
    response.send(request.body)
})

app.listen(port , ()=>{
  mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_URI}/${dbName}` , 
                    { useNewUrlParser: true })
  console.log(`connected on Port ${port}`)
})