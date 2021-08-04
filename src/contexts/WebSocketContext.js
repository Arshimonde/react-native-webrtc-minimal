import React from 'react'


const WebSocketContext = React.createContext({
    message: {command: "idle"},
    setMessage: (message)=>{}
    // plus other data
})

export default WebSocketContext