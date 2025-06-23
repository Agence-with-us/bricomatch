import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  BackHandler,
  ActivityIndicator,
  Dimensions,
  AppState,
} from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { collection, doc, setDoc, onSnapshot, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../../config/firebase.config';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Configuration ICE servers (STUN/TURN)
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface VideoCallProps {
  navigation: any;
  route: {
    params: {
      roomId: string;
      isInitiator: boolean;
    };
  };
}

const VideoCall: React.FC<VideoCallProps> = ({ navigation, route }) => {
  const { roomId, isInitiator } = route.params;
  
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [callEnded, setCallEnded] = useState(false);
  
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const roomRef = useRef<any>(null);
  const candidatesCollection = useRef<any>(null);
  const backHandler = useRef<any>(null);

  // Établir la connexion WebRTC et configurer les écouteurs Firebase
  useEffect(() => {
    // Créer une référence à la salle dans Firestore
    roomRef.current = doc(firestore, 'calls', roomId);
    candidatesCollection.current = collection(roomRef.current, 'candidates');

    // Configurer le gestionnaire de retour en arrière
    backHandler.current = BackHandler.addEventListener('hardwareBackPress', () => {
      endCall();
      return true;
    });
    
    // Surveiller l'état de l'application (premier plan/arrière-plan)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // L'application passe en arrière-plan, on peut considérer que l'utilisateur quitte
        // Nettoyage sans message d'alerte car l'app est en arrière-plan
        cleanUp();
        
        // On peut aussi notifier l'autre participant via Firestore
        if (roomRef.current && isConnected) {
          updateDoc(roomRef.current, { 
            participantLeft: true,
            leftAt: new Date().toISOString(),
            leftBy: isInitiator ? 'initiator' : 'participant'
          }).catch(err => console.log("Erreur mise à jour statut départ:", err));
        }
      }
    });

    // Démarrer l'appel vidéo
    startCall();

    // Nettoyer lors du démontage du composant
    return () => {
      cleanUp();
      backHandler.current?.remove();
      subscription.remove();
    };
  }, []);

  const startCall = async () => {
    try {
      // Obtenir les flux média locaux (caméra et microphone)
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      
      setLocalStream(stream);
      
      // Créer une nouvelle connexion WebRTC
      peerConnection.current = new RTCPeerConnection(configuration);
      
      // Ajouter les pistes locales à la connexion
      stream.getTracks().forEach((track) => {
        peerConnection.current?.addTrack(track, stream);
      });
      
      // Écouter les pistes distantes
      //@ts-ignore
      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
        setIsConnecting(false);
      };
      
      // Gérer les candidats ICE
      //@ts-ignore
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCollection.current, event.candidate.toJSON());
        }
      };
      
      // Si c'est l'initiateur, créer l'offre
      if (isInitiator) {
        await createOffer();
      } else {
        // Si c'est le participant, écouter l'offre
        const unsubscribeRoom = onSnapshot(roomRef.current, async (snapshot: any) => {
          const data = snapshot.data();
          if (data && data.offer && !peerConnection.current?.remoteDescription) {
            await createAnswer(data.offer);
          }
        });
        
        // Nettoyage de l'écouteur
        return () => unsubscribeRoom();
      }
      
      // Écouter les candidats ICE du pair distant
      const unsubscribeCandidates = onSnapshot(candidatesCollection.current, (snapshot : any) => {
        snapshot.docChanges().forEach(async (change : any) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            await peerConnection.current?.addIceCandidate(candidate);
            
            // Si nous sommes l'initiateur et que nous recevons des candidats ICE,
            // cela signifie que quelqu'un a bien rejoint
            if (isInitiator && isConnecting) {
              console.log("Un participant a commencé à se connecter");
            }
          }
        });
      });
      
      // Vérifier l'état de la connexion
      //@ts-ignore
      peerConnection.current.oniceconnectionstatechange = () => {
        const iceState = peerConnection.current?.iceConnectionState;
        
        if (iceState === 'disconnected' || iceState === 'failed' || iceState === 'closed') {
          // La connexion est perdue
          setIsConnected(false);
          
          // Si la connexion a été établie avant puis perdue
          if (!isConnecting && !callEnded) {
            setCallEnded(true);
            
            // Afficher un message indiquant que l'autre participant a quitté
            Alert.alert(
              "Appel terminé",
              "L'autre participant a quitté l'appel.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
            
            // Si c'est le participant qui a quitté et non l'initiateur, on nettoie quand même
            // les ressources Firestore pour éviter les salles fantômes
            if (!isInitiator && roomRef.current) {
              // deleteDoc(roomRef.current).catch(err => 
              //   console.log('Erreur lors de la suppression de la salle par le participant:', err)
              // );
            }
          } else if (isConnecting) {
            // Si la connexion échoue pendant l'initialisation
            setIsConnecting(false);
            if (!callEnded) {
              Alert.alert(
                "Connexion échouée",
                "Impossible d'établir une connexion avec l'autre participant.",
                [{ text: "OK", onPress: () => navigation.goBack() }]
              );
            }
          }
        }
      };
      
      // Pour l'initiateur, nous ne mettons pas de timeout automatique
      // afin qu'il puisse attendre aussi longtemps qu'il le souhaite
      const connectionTimeout = setTimeout(() => {
        // if (isConnecting && !isConnected && !isInitiator) {
        //   // Afficher l'alerte uniquement pour celui qui rejoint, pas pour l'initiateur
        //   setIsConnecting(false);
        //   Alert.alert(
        //     "Connexion échouée",
        //     "Impossible de rejoindre l'appel. Vérifiez le code de salle et réessayez.",
        //     [{ text: "OK", onPress: () => navigation.goBack() }]
        //   );
        // }
      }, 60000); // 60 secondes - uniquement pour celui qui rejoint
      
      return () => {
        clearTimeout(connectionTimeout);
        unsubscribeCandidates();
      };
      
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'appel:', error);
      Alert.alert(
        "Erreur",
        "Impossible d'accéder à la caméra ou au microphone. Veuillez vérifier vos permissions.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    }
  };

  // Créer une offre (côté initiateur)
  const createOffer = async () => {
    try {
      // Générer l'offre SDP
      //@ts-ignore
      const offerDescription = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offerDescription);
      
      // Enregistrer l'offre dans Firestore
      const offer = {
        type: offerDescription?.type,
        sdp: offerDescription?.sdp,
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(roomRef.current, { offer });
      
      // Écouter la réponse
      // Écouter la réponse et autres événements de la salle
      const unsubscribe = onSnapshot(roomRef.current, (snapshot : any) => {
        const data = snapshot.data();
        
        // Gérer la réponse SDP
        if (data?.answer && !peerConnection.current?.remoteDescription) {
          const answerDescription = new RTCSessionDescription(data.answer);
          peerConnection.current?.setRemoteDescription(answerDescription);
          
          // Si nous recevons une réponse en tant qu'initiateur, cela signifie que
          // quelqu'un a rejoint l'appel avec succès
          if (isInitiator && isConnecting) {
            console.log("Un participant a rejoint l'appel");
            // Nous pouvons mettre à jour l'interface ici si nécessaire
          }
        }
        
        // Détecter si l'autre participant a quitté l'appel (via Firestore)
        if (data?.participantLeft && !callEnded) {
          const whoLeft = data.leftBy === 'initiator' ? "L'initiateur" : "Le participant";
          console.log(`${whoLeft} a quitté l'appel`);
          
          if (isConnected && !callEnded) {
            setCallEnded(true);
            Alert.alert(
              "Appel terminé",
              "L'autre participant a quitté l'appel.",
              [{ text: "OK", onPress: () => navigation.goBack() }]
            );
          }
        }
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Erreur lors de la création de l\'offre:', error);
      Alert.alert("Erreur", "Impossible de créer l'appel");
    }
  };

  // Créer une réponse (côté participant)
  const createAnswer = async (offer: any) => {
    try {
      // Définir l'offre reçue comme description distante
      const offerDescription = new RTCSessionDescription(offer);
      await peerConnection.current?.setRemoteDescription(offerDescription);
      
      // Créer la réponse
      const answerDescription = await peerConnection.current?.createAnswer();
      await peerConnection.current?.setLocalDescription(answerDescription);
      
      // Enregistrer la réponse dans Firestore
      const answer = {
        type: answerDescription?.type,
        sdp: answerDescription?.sdp,
        createdAt: new Date().toISOString(),
      };
      
      await updateDoc(roomRef.current, { answer });
    } catch (error) {
      console.error('Erreur lors de la création de la réponse:', error);
      Alert.alert("Erreur", "Impossible de rejoindre l'appel");
    }
  };

  // Mettre fin à l'appel
  const endCall = async () => {
    try {
      setCallEnded(true);
      
      // Nettoyer les ressources
      cleanUp();
      
      // Supprimer la salle Firestore
      if (roomRef.current) {
        // Peu importe qui termine l'appel, nous essayons de supprimer la salle
        // Pour éviter les salles "fantômes" dans Firestore
        try {
          // await deleteDoc(roomRef.current);
          // console.log("Salle supprimée avec succès");
        } catch (error) {
          console.log("Erreur lors de la suppression de la salle:", error);
          // Si erreur de permission ou autre, on ne bloque pas l'utilisateur
        }
      }
      
      // Retourner à l'écran précédent
      navigation.goBack();
    } catch (error) {
      console.error('Erreur lors de la fin de l\'appel:', error);
      navigation.goBack();
    }
  };

  // Nettoyer les ressources
  const cleanUp = () => {
    if (localStream) {
      localStream.getTracks().forEach((track: any) => {
        track.stop();
      });
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    setLocalStream(null);
    setRemoteStream(null);
  };

  // Basculer le microphone
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      for (const track of audioTracks) {
        track.enabled = !track.enabled;
      }
      setIsMuted(!isMuted);
    }
  };

  // Basculer la caméra
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      for (const track of videoTracks) {
        track.enabled = !track.enabled;
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Changer de caméra (avant/arrière)
  const switchCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack._switchCamera();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Afficher l'écran de chargement si la connexion est en cours */}
      {isConnecting && !isConnected && !callEnded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>
            {isInitiator 
              ? 'En attente d\'un participant...\nCode de salle: ' + roomId + '\n\nPartagez ce code pour que quelqu\'un puisse vous rejoindre.'
              : 'Connexion à l\'appel en cours...'}
          </Text>
          {isInitiator && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={endCall}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Afficher les flux vidéo une fois connecté */}
      {!callEnded && (
        <View style={styles.videoContainer}>
          {/* Flux vidéo distant (grand écran) */}
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <View style={[styles.remoteVideo, styles.noVideoContainer]}>
              <Text style={styles.noVideoText}>En attente de vidéo...</Text>
            </View>
          )}
          
          {/* Flux vidéo local (petit écran) */}
          {localStream && (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
              zOrder={1}
            />
          )}
          
          {/* Contrôles d'appel */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.endCallButton]}
              onPress={endCall}
            >
              <Ionicons name="call" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
              onPress={toggleVideo}
            >
              <Ionicons
                name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color="white"
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={switchCamera}
            >
              <Ionicons name="camera-reverse" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          {/* Afficher le code de salle pour l'initiateur */}
          {isInitiator && (
            <View style={styles.roomIdContainer}>
              <Text style={styles.roomIdText}>Code de salle: {roomId}</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 30,
    lineHeight: 24,
  },
  cancelButton: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#323232',
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: width / 4,
    height: (width / 4) * 1.33,
    backgroundColor: '#4a4a4a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 2,
  },
  noVideoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#323232',
  },
  noVideoText: {
    color: 'white',
    fontSize: 16,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    zIndex: 3,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    transform: [{ rotate: '135deg' }],
  },
  roomIdContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
    zIndex: 3,
  },
  roomIdText: {
    color: 'white',
    fontSize: 14,
  },
});

export default VideoCall;