import React from 'react'
import { View, Text, FlatList, StyleSheet, Alert, DevSettings } from 'react-native'
import { Colors, IconButton, List } from 'react-native-paper'
import UserContext from '../contexts/UserContext'
import WebSocketContext from '../contexts/WebSocketContext'
import { ws } from '../utils/WebsocketController'

const connectivityStatus = ["idle", "connect", "disconnected"]

const Users = ({navigation}) => {
    const userContext = React.useContext(UserContext)
    const wsContext = React.useContext(WebSocketContext)
    const [users, setUsers] = React.useState([])

    React.useEffect(()=>{
        if(connectivityStatus.includes(wsContext.message.command))
            fetchOnlineUsers()
    },[wsContext])

    React.useEffect(() => {

        ws.onmessage = (ev) => {
            const message = JSON.parse(ev.data);
            
            if (message) {
                wsContext.setMessage(message)

                if(message.command === "offer"){
                    calling(message, ()=>{
                        navigation.navigate("Call", {offer: message, user: userContext.user})
                    })
                }

            } else {
                alert("Quelque chose ne va pas contactez le développeur")
                console.log("Malformed Message")
            }
        }

        ws.onerror = (e) => {
          console.error(e);
          alert("Connexion perdue! SVP activer la connexion internet")
          DevSettings.reload()
        }
        

        return () => {
          ws.send(JSON.stringify({
              command  : "disconnected",
              userId: userContext.user.userId
          }))
        }

    }, [])
    
    const calling = (message,onAccept, onRefuse)=>{
        Alert.alert(
          "Appel Video",
          `${message.username} vous appelez`,
          [
            { text: "Accepter", onPress: () => onAccept() }
          ]
        );
    }

    // Request Online Users
    const fetchOnlineUsers = ()=>{
        fetch("http://10.0.0.13:3000/onlineUsers")
        .then((response) => response.json())
        .then((responseJson)=> setUsers(responseJson))
        .catch((err)=> console.error(err))
    }

    const Item = ({username, id}) =>(
            userContext.user.userId != id && <List.Item
            title={username.toUpperCase()}
            description="Utilisateur disponible"
            left={props => <List.Icon {...props} icon="account" />}
            right={props => <IconButton 
                  icon="phone" color={Colors.green500} 
                  size={30}
                  onPress={()=> navigation.navigate("Call", {user: userContext.user, recipient: {username, id}})}
              ></IconButton>}
        />
    )


    return (
        <FlatList
            data={users}
            renderItem={ ({ item }) => <Item username={item.username} id={item.id}/>}
            keyExtractor={item => item.id.toString()}
        />
    )
}

  

export default Users
