import React from 'react';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack'
import Home from './screens/Home';
import Users from './screens/Users';
import UserContext from './contexts/UserContext';
import WebSocketContext from './contexts/WebSocketContext';
import VideoCall from './screens/VideoCall';
import { ws } from './utils/WebsocketController'
import { Alert } from 'react-native';

const Stack = createStackNavigator()

export default function App() {

  const [userState, setUserState] = React.useState({
    user: null,
    updateUser: (user) => {
      setUserState({
        ...userState,
        user
      })
    }
  })

  const [wsMessage, setWsMessage] = React.useState({
    message: { command: "idle" }, setMessage: (message) => {
      setWsMessage({
        ...wsMessage,
        message
      })
    }
  })


  return (
    <PaperProvider theme={DefaultTheme}>
      <UserContext.Provider value={userState}>
        <WebSocketContext.Provider value={wsMessage}>
          <NavigationContainer>
            <Stack.Navigator>

              <Stack.Screen name="Home" component={Home} options={{
                title: "Accueil"
              }} />

              <Stack.Screen name="Users" component={Users} options={{
                title: "Utilisateurs"
              }} />
              <Stack.Screen name="Call" component={VideoCall} options={{
                title: "Appelle Video"
              }} />

            </Stack.Navigator>
          </NavigationContainer>
        </WebSocketContext.Provider>
      </UserContext.Provider>
    </PaperProvider>
  );
}
