import React, { useState, useEffect, useRef } from 'react';
import { Alert, BackHandler, Text, View } from 'react-native';

import {
  RTCPeerConnection,
  RTCView,
  mediaDevices,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
} from 'react-native-webrtc';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  deleteField,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/RootStackParamList';

const configuration = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function VideoCallScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoCall'>>();
  const { appointment, needToStartCall } = route.params;
  const appointmentId = appointment.id;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isOffCam, setIsOffCam] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);

  const callStarted = useRef(false);
  const cachedLocalPCRef = useRef<RTCPeerConnection | null>(null);
  const subscriptions = useRef<Array<() => void>>([]);

  useEffect(() => {
    startLocalStream();
  }, []);
  useEffect(() => {
    if (
      localStream &&
      (!needToStartCall || appointmentId) &&
      !callStarted.current
    ) {
      startOrJoinCall(appointmentId);
    }
  }, [localStream, appointmentId]);

  useEffect(() => {
    const backAction = () => {
      endCall();
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove(); // Cleanup the event listener on unmount
  }, []);

  const clearNodeOnUserLeave = async () => {
    const cachedLocalPC = cachedLocalPCRef.current;

    subscriptions.current.forEach((unsubscribe) => {
      unsubscribe();
    });

    if (cachedLocalPC) {
      // Stop all tracks before closing the connection
      const senders = cachedLocalPC.getSenders();
      senders.forEach((sender) => {
        sender?.track?.stop(); // Stop the track
        cachedLocalPC.removeTrack(sender);
      });

      // Close the peer connection
      cachedLocalPC.close();
      cachedLocalPCRef.current = null; // Clear the cached connection
    }

    const roomRef = doc(dbFirestore, 'appointments', appointmentId);
    await updateDoc(roomRef, {
      isCallStarted: deleteField(),
      offer: deleteField(),
      answer: deleteField(),
      connected: deleteField(),
    });

    const callerCandidatesRef = collection(roomRef, 'callerCandidates');
    const callerCandidatesSnapshot = await getDocs(callerCandidatesRef);
    callerCandidatesSnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    const calleeCandidatesRef = collection(roomRef, 'calleeCandidates');
    const calleeCandidatesSnapshot = await getDocs(calleeCandidatesRef);
    calleeCandidatesSnapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    localStream?.getTracks().forEach((track) => {
      track.stop();
    });
    remoteStream?.getTracks().forEach((track) => {
      track.stop();
    });
    setLocalStream(null);
    setRemoteStream(null);
  };

  const endCall = async () => {
    await clearNodeOnUserLeave();
    navigate('Main')
  };

  const startLocalStream = async () => {
    const isFront = true;
    const devices = (await mediaDevices.enumerateDevices()) as any[];

    const facing = isFront ? 'front' : 'environment';
    const videoSourceId = devices.find(
      (device) => device.kind === 'videoinput' && device.facing === facing
    );
    const facingMode = isFront ? 'user' : 'environment';
    const constraints = {
      audio: true,
      video: {
        mandatory: {
          minWidth: 500,
          minHeight: 300,
          minFrameRate: 30,
        },
        facingMode,
        optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
      },
    };
    const newStream = await mediaDevices.getUserMedia(constraints);
    setLocalStream(newStream);
  };

  const startOrJoinCall = async (id: string) => {
    callStarted.current = true;
    const roomRef = doc(dbFirestore, 'appointments', id);
    const roomSnapshot = await getDoc(roomRef);

    if (!needToStartCall) {
      if (!roomSnapshot.exists) return;
    }

    const localPC = new RTCPeerConnection(configuration);
    localStream?.getTracks().forEach((track) => {
      localPC.addTrack(track, localStream);
    });

    const callerCandidatesCollection = collection(roomRef, 'callerCandidates');
    const calleeCandidatesCollection = collection(roomRef, 'calleeCandidates');

    localPC.addEventListener('icecandidate', (e) => {
      if (!e.candidate) {
        return;
      }
      addDoc(
        needToStartCall
          ? callerCandidatesCollection
          : calleeCandidatesCollection,
        e.candidate.toJSON()
      );
    });

    localPC.addEventListener('track', (e) => {
      const newStream = new MediaStream();
      e.streams[0].getTracks().forEach((track) => {
        newStream.addTrack(track);
      });
      setRemoteStream(() => newStream);
    });

    if (needToStartCall) {
      const offer = await localPC.createOffer({});
      await localPC.setLocalDescription(offer);

      await setDoc(roomRef, { offer, connected: false }, { merge: true });

      const unsubscribe = onSnapshot(roomRef, (doc) => {
        const data = doc.data();
        if (!localPC.remoteDescription && data?.answer) {
          const rtcSessionDescription = new RTCSessionDescription(data.answer);
          localPC.setRemoteDescription(rtcSessionDescription);
        } else {
          setRemoteStream(null);
        }
      });
      subscriptions.current.push(unsubscribe);
    } else {
      const offer = roomSnapshot?.data()?.offer;
      await localPC.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await localPC.createAnswer();
      await localPC.setLocalDescription(answer);
      // @ts-expect-error
      await updateDoc(roomRef, { answer, connected: true }, { merge: true });
    }

    const unsubscribe = onSnapshot(
      needToStartCall ? calleeCandidatesCollection : callerCandidatesCollection,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            let data = change.doc.data();
            localPC.addIceCandidate(new RTCIceCandidate(data));
          }
        });
      }
    );
    subscriptions.current.push(unsubscribe);
    const unsubscribeRoomRef = onSnapshot(roomRef, (doc) => {
      const data = doc.data();
      if (
        (!needToStartCall && !data?.answer) ||
        (needToStartCall && !data?.offer)
      ) {
        Alert.alert('Le partenaire a quitté la conversation');
        localPC.close();
        endCall();
      }
    });
    subscriptions.current.push(unsubscribeRoomRef);

    cachedLocalPCRef.current = localPC;
  };

  const switchCamera = () => {
    localStream?.getVideoTracks().forEach((track) => track._switchCamera());
  };

  const toggleMicMute = () => {
    if (!remoteStream) {
      return;
    }
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsMicMuted(!track.enabled);
    });
  };

  const toggleSpeakerMute = () => {
    remoteStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsSpeakerMuted(!track.enabled);
    });
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      setIsOffCam(!isOffCam);
    });
  };

  return (
    <View className="flex-1">
      {remoteStream ? (
        <RTCView
          className="flex-1"
          streamURL={remoteStream?.toURL()}
          objectFit={'cover'}
        />
      ) : (
        <View className="flex-1 justify-center items-center bg-black">
          <Text className="text-white text-lg">
            En attente d'un participant
          </Text>
        </View>
      )}
      <View className="absolute left-6 top-14 m-0 p-0 w-fit h-fit">
      <GoBack diameter={45} />
      </View>
      {localStream && !isOffCam && (
          <View className="absolute right-3 top-14 rounded-[20px]  m-0 p-0 overflow-hidden w-[117] h-[165] bg-accent border-[4px] border-accent">
            <RTCView
                className="w-full h-full m-0 p-0"
                streamURL={localStream?.toURL()}
                objectFit="cover"
            />
          </View>

      )}
      <View className="absolute bottom-0 w-full px-4">
        <CallActionBox
          switchCamera={switchCamera}
          toggleMicMute={toggleMicMute}
          isMicMuted={isMicMuted}
          toggleSpeakerMute={toggleSpeakerMute}
          isSpeakerMuted={isSpeakerMuted}
          toggleCamera={toggleCamera}
          isCameraOn={!isOffCam}
          endCall={endCall}
          appointment={appointment}
        />
      </View>
    </View>
  );
}
