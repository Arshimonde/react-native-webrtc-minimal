import React from 'react'

// user object properties
// {
//     id
//     username,
// }

const UserContext = React.createContext({
    user: null,
    updateUser: ()=>{}
})

export default UserContext