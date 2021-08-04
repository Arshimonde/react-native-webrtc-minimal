import React from 'react'
import { View, Text, Alert } from 'react-native'
import { Button, TextInput, Title } from 'react-native-paper'
import UserContext from '../contexts/UserContext'
import WebSocketContext from '../contexts/WebSocketContext'
import random from '../utils/random'
import {ws} from '../utils/WebsocketController'


const Home = ({ navigation }) => {
    const userContext = React.useContext(UserContext)
    const [username, setUsername] = React.useState("")

    const onUsername = () => {
        const user = {
            userId: random(),
            username
        }
        ws.send(JSON.stringify({
            command: "connect",
            ...user
        }))

        userContext.updateUser(user)
        navigation.navigate("Users")
    }


    return (
        <View style={{ flex: 1, padding: 20, paddingTop: 50 }}>
            <Title style={{ marginBottom: 20 }}>Bienvenue chez MT Call</Title>
            <TextInput
                label="Entrez votre username"
                value={username}
                onChangeText={text => setUsername(text)}
            />
            <Button
                onPress={onUsername}
                mode="contained"
                style={{ marginTop: 15, paddingVertical: 8, width: 150, alignSelf: "center" }}
            >Ok</Button>
        </View>
    )
}

export default Home
