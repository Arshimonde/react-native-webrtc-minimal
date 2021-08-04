import React, { Component } from 'react';
import { View, SafeAreaView, Button, StyleSheet, Alert, Dimensions } from 'react-native';
import { Text, IconButton, Colors } from 'react-native-paper';
import { RTCPeerConnection, RTCView, mediaDevices, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import WebSocketContext from '../contexts/WebSocketContext';
import { ws } from '../utils/WebsocketController';


// You'll most likely need to use a STUN server at least. Look into TURN and decide if that's necessary for your project
const configuration = { iceServers: [{ url: 'stun:stun.l.google.com:19302' }] };

class VideoCall extends Component {
  rtcPeerConnection = null

  constructor(props) {
    super(props)

    this.params = props.route.params

    if (this.params && this.params.user) {
      this.user = this.params.user
    }
    
    if(this.params?.offer){
      this.isCaller = false
      this.target = this.params.offer.userId
    }
    else{
      this.isCaller = true
      this.target = this.params.recipient.id
    }

    this.state = {
      localStream: null,
      remoteStream: null,
      isMuted: false
    }

    this.screen = Dimensions.get("screen")
  }



  componentDidMount(){
    if(this.isCaller){
      this.startCall()
    }else{
      this.answerCall(this.params.offer)
    }
  }


  componentDidUpdate(){
    const wsMessage = this.context.message
    const command = wsMessage.command 
    switch (command) {
      case "answer":
        this.rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(wsMessage.sessionDescription))
        break;
      case "candidate":
        this.rtcPeerConnection.addIceCandidate(new RTCIceCandidate(wsMessage.candidate))
        break;
      case "call_ended":
        alert("Appel Terminé")
        this.context.setMessage({command:"idle"})
        this.closePeer()
        this.props.navigation.goBack()
        break;
      default:
        break;
    }
  }


  startCall = async () => {
    try {
      this.setupPeer()
      const isStreamStarted = await this.startLocalStream()
      if(this.isCaller && isStreamStarted){
        // Create OFFER
        const offer = await this.rtcPeerConnection.createOffer()
        await this.rtcPeerConnection.setLocalDescription(offer);
        ws.send(JSON.stringify({
          command: "offer",
          userId: this.user.userId,
          username: this.user.username,
          target: this.target,
          sessionDescription: this.rtcPeerConnection.localDescription
        }))
      }
    } catch (error) {
      console.error(error);
    }

  };

  answerCall = async (message) => {
    try {
      this.setupPeer()
      const sdp = new RTCSessionDescription(message.sessionDescription)
      await this.rtcPeerConnection.setRemoteDescription(sdp);
      await this.startLocalStream()
      const answer = await this.rtcPeerConnection.createAnswer();
      ws.send(JSON.stringify({
        command: "answer",
        userId: this.user.userId,
        target: this.params.offer.userId,
        sessionDescription:  answer,
      }))
      await this.rtcPeerConnection.setLocalDescription(answer);
    } catch (error) {
      console.error(error);
    }
  }

  setupPeer = () => {
    this.rtcPeerConnection = new RTCPeerConnection(configuration);

    this.rtcPeerConnection.onicecandidate = this.onIceCandidate
    this.rtcPeerConnection.onaddstream = this.onAddStream
    this.rtcPeerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChangeEvent
    // for testing Purpose
    const dataChannel = this.rtcPeerConnection.createDataChannel('myDataChannel', { reliable: true })
    dataChannel.onopen = e => console.log("DATA CHANNEL OPEN");
  }

  onAddStream = (e)=>{
    // DECRYPT STREAM HERE
    if (e.stream && this.state.remoteStream !== e.stream) {
      this.setState({ remoteStream: e.stream })
    }
  }


  onIceCandidate = (e) => {
    if (e.candidate) {
      ws.send(JSON.stringify({
        command: "candidate",
        target: this.target,
        candidate: e.candidate
      }))
    }
  }


  startLocalStream = async () => {
    try {
      // isFront will determine if the initial camera should face user or environment
      const isFront = true;
      const devices = await mediaDevices.enumerateDevices();

      const facing = isFront ? 'front' : 'environment';
      const videoSourceId = devices.find(device => device.kind === 'videoinput' && device.facing === facing);
      const facingMode = isFront ? 'user' : 'environment';
      const constraints = {
        audio: true,
        video: {
          // mandatory: {
          //   minWidth: 500, // Provide your own width, height and frame rate here
          //   minHeight: 300,
          //   minFrameRate: 30,
          // },
          facingMode,
          optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
        },
      };
      const newStream = await mediaDevices.getUserMedia(constraints);
          // AddTrack not supported yet, so have to use old school addStream instead
      // newStream.getTracks().forEach(track => localPC.addTrack(track, newStream));
      this.rtcPeerConnection.addStream(newStream);
      this.setState({localStream: newStream});
      return true;
    } catch (error) {
        this.handleGetUserMediaError(error)
        return false
    }
  };

  handleGetUserMediaError = (e) => {
    switch(e.name) {
      case "NotFoundError":
        alert("Impossible d'ouvrir votre appel car pas de caméra et/ou de micro ont été trouvés.");
        break;
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        alert("Les autorisations micro et/ou caméra n'ont pas été accordées");
        break;
      default:
        alert("Erreur lors de l'ouverture de votre caméra et/ou microphone: " + e.message);
        break;
    }
  
    this.closeStreams();
  }

  


  switchCamera = () => {
    this.state.localStream.getVideoTracks().forEach(track => track._switchCamera());
  };

  // Mutes the local's outgoing audio
  toggleMute = () => {
    if (!this.state.remoteStream) return;
    this.state.localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      this.setState({isMuted: !track.enabled})
    });
  };

  closeStreams = () => {
    this.closePeer()
    ws.send(JSON.stringify({
      command: "call_ended",
      target: this.target
    }))
    this.isStreamClosed = true
    this.props.navigation.goBack()
  };

  closePeer = ()=>{
    if (this.rtcPeerConnection) {
      this.rtcPeerConnection.onicecandidate = null;
      this.rtcPeerConnection.onaddstream = null;
      this.rtcPeerConnection.close();
      this.rtcPeerConnection = null;
    }
  }
  handleICEConnectionStateChangeEvent = (event) => {
    const state = event.target.iceConnectionState
    if(state === "failed"){
      alert("Connexion perdue")
      this.closeStreams();
    }
  }

  render() {
    return (
        <SafeAreaView style={styles.container}>
          {!this.state.localStream && <Text>en attendant la camera....</Text>}
          {this.state.localStream && (
            <View style={styles.toggleButtons}>
              <IconButton
                size={35}
                color={Colors.orange500}
                icon={"camera-switch"}
                onPress={this.switchCamera}
              ></IconButton>
              <IconButton
                size={35}
                color={Colors.orange500}
                icon={this.state.isMuted ? 'volume-high' : 'volume-off'}
                onPress={this.toggleMute}
                disabled={!this.state.remoteStream} 
              ></IconButton>
            </View>
          )} 

          <View style={{ zIndex:2,bottom:60, right:20, position:'absolute', width:"35%", height:"25%"}}>
            {this.state.localStream && <RTCView style={{height:"100%", width: "100%"}} streamURL={this.state.localStream.toURL()} />}
          </View>
          {this.state.remoteStream && <RTCView 
            style={{...StyleSheet.absoluteFillObject}} 
            streamURL={this.state.remoteStream.toURL()} 
          />}
          <IconButton
            icon="phone-hangup-outline"
            color={Colors.red500}
            size={35}
            onPress={this.closeStreams}
            disabled={!this.state.remoteStream}
          />
        </SafeAreaView>
    )
  }
}

VideoCall.contextType = WebSocketContext;

export default VideoCall

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#313131',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    position:'relative',
  },
  text: {
    fontSize: 30,
  },
  rtcview: {
    justifyContent: 'center',
    alignItems: 'center',
    height: '40%',
    width: '80%',
    backgroundColor: 'black',
  },
  rtc: {
    width: '80%',
    height: '100%',
  },
  toggleButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 2
  },
});
