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

import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../types/RootStackParamList';
import { firestore } from '../../config/firebase.config';
import { navigate } from '../../services/navigationService';
import CallActionBox from '../../components/elements/calls/CallActionBox';
import RatingModal from '../../components/elements/fiche-professionnel/RatingModal';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { UserRole } from '../../store/users/types';

// Import InCallManager for audio routing
import InCallManager from 'react-native-incall-manager';

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
    const { appointmentEtUser, needToStartCall } = route.params;
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [ratingModalVisible, setRatingModalVisible] = useState(false);

    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isOffCam, setIsOffCam] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);

    // 🔹 États pour le suivi de la durée
    const [callStartTime, setCallStartTime] = useState<Date | null>(null);
    const [bothUsersConnected, setBothUsersConnected] = useState(false);
    const [elapsedTime, setElapsedTime] = useState<string>("00:00");

    const callStarted = useRef(false);
    const cachedLocalPCRef = useRef<RTCPeerConnection | null>(null);
    const subscriptions = useRef<Array<() => void>>([]);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    // 🔹 Initialize audio routing when component mounts
    useEffect(() => {
        // Start call manager with video call configuration
        InCallManager.start({ media: 'video', auto: false });

        // Force speaker output
        InCallManager.setSpeakerphoneOn(true);
        InCallManager.setForceSpeakerphoneOn(true);

        return () => {
            // Clean up audio routing when component unmounts
            InCallManager.stop();
        };
    }, []);

    // 🔹 Timer pour afficher le temps écoulé
    useEffect(() => {
        if (callStartTime && bothUsersConnected) {
            timerInterval.current = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - callStartTime.getTime();
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
        }

        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
            }
        };
    }, [callStartTime, bothUsersConnected]);

    useEffect(() => {
        startLocalStream();
    }, []);

    useEffect(() => {
        if (
            localStream &&
            (!needToStartCall || appointmentEtUser.appointment.id) &&
            !callStarted.current
        ) {
            startOrJoinCall(appointmentEtUser.appointment.id as string);
        }
    }, [localStream, appointmentEtUser.appointment.id]);

    useEffect(() => {
        const backAction = () => {
            endCall();
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    // 🔹 Fonction pour sauvegarder la durée de l'appel dans un tableau
    const saveCallDuration = async () => {
        if (!callStartTime || !bothUsersConnected) return;

        const callEndTime = new Date();
        const durationMs = callEndTime.getTime() - callStartTime.getTime();
        const durationMinutes = Math.round(durationMs / (1000 * 60));

        try {
            const roomRef = doc(firestore, 'appointments', appointmentEtUser.appointment.id as string);
            const roomSnapshot = await getDoc(roomRef);
            const currentData = roomSnapshot.data();

            // Récupérer l'historique existant des appels ou créer un nouveau tableau
            const existingCallHistory = currentData?.callHistory || [];

            // Ajouter le nouvel appel à l'historique
            const newCallRecord = {
                startTime: callStartTime.toISOString(),
                endTime: callEndTime.toISOString(),
                durationMs: durationMs,
                durationMinutes: durationMinutes,
                callIndex: existingCallHistory.length + 1
            };

            const updatedCallHistory = [...existingCallHistory, newCallRecord];

            // Calculer la durée totale de tous les appels
            const totalDurationMinutes = updatedCallHistory.reduce((total, call) => total + call.durationMinutes, 0);

            await updateDoc(roomRef, {
                callHistory: updatedCallHistory,
                totalCallDuration: totalDurationMinutes,
                lastCallDuration: newCallRecord
            });

        
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la durée:', error);
        }
    };

    const clearNodeOnUserLeave = async () => {
        // 🔹 Arrêter le timer
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }

        const cachedLocalPC = cachedLocalPCRef.current;

        subscriptions.current.forEach((unsubscribe) => {
            unsubscribe();
        });

        if (cachedLocalPC) {
            const senders = cachedLocalPC.getSenders();
            senders.forEach((sender) => {
                sender?.track?.stop();
                cachedLocalPC.removeTrack(sender);
            });

            cachedLocalPC.close();
            cachedLocalPCRef.current = null;
        }

        const roomRef = doc(firestore, 'appointments', appointmentEtUser.appointment.id as string);
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
        // 🔹 Sauvegarder la durée avant de nettoyer
        await saveCallDuration();

        await clearNodeOnUserLeave();

        // Stop InCallManager
        InCallManager.stop();

        const [minutesStr] = elapsedTime.split(':');
        const minutes = parseInt(minutesStr, 10);
      

        //si un minute est passé
        if (currentUser?.role !== UserRole.PRO)
            setRatingModalVisible(true);
        else
            navigate('Appointments');
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
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
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
        const roomRef = doc(firestore, 'appointments', id);
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

            // 🔹 Ensure speaker is enabled when remote stream is received
            if (true) {
                InCallManager.setSpeakerphoneOn(true);
                InCallManager.setForceSpeakerphoneOn(true);
            }
        });

        if (needToStartCall) {
            const offer = await localPC.createOffer({});
            await localPC.setLocalDescription(offer);

            await setDoc(roomRef, {
                offer,
                connected: false,
                isCallStarted: true
            }, { merge: true });

            const unsubscribe = onSnapshot(roomRef, (doc) => {
                const data = doc.data();
                if (!localPC.remoteDescription && data?.answer && data?.connected) {
                    const rtcSessionDescription = new RTCSessionDescription(data.answer);
                    localPC.setRemoteDescription(rtcSessionDescription);

                    // 🔹 Les deux utilisateurs sont maintenant connectés
                    if (!bothUsersConnected) {
                        setBothUsersConnected(true);
                        setCallStartTime(new Date());
                        console.log('Appel commencé - les deux utilisateurs sont connectés');

                        // Ensure speaker is on when call starts
                        if (true) {
                            InCallManager.setSpeakerphoneOn(true);
                            InCallManager.setForceSpeakerphoneOn(true);
                        }
                    }
                } else if (!data?.connected) {
                    setRemoteStream(null);
                }
            });
            subscriptions.current.push(unsubscribe);
        } else {
            const offer = roomSnapshot?.data()?.offer;
            await localPC.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await localPC.createAnswer();
            await localPC.setLocalDescription(answer);

            await updateDoc(roomRef, {
                answer,
                connected: true,
                isCallStarted: true
            }, { merge: true });

            // 🔹 Pour celui qui rejoint, l'appel commence maintenant
            if (!bothUsersConnected) {
                setBothUsersConnected(true);
                setCallStartTime(new Date());
                console.log('Appel commencé - utilisateur rejoint');

                // Ensure speaker is on when call starts
                if (true) {
                    InCallManager.setSpeakerphoneOn(true);
                    InCallManager.setForceSpeakerphoneOn(true);
                }
            }
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

        localStream?.getAudioTracks().forEach((track) => {
            track.enabled = !track.enabled;
            setIsMicMuted(!track.enabled);
        });
    };

    // Updated toggleSpeakerMute to work with InCallManager
    const toggleSpeakerMute = () => {
        const newMuteState = !isSpeakerMuted;
        setIsSpeakerMuted(newMuteState);

        if (newMuteState) {
            // Mute remote audio but keep speaker routing
            remoteStream?.getAudioTracks().forEach((track) => {
                track.enabled = false;
            });
        } else {
            // Unmute remote audio
            remoteStream?.getAudioTracks().forEach((track) => {
                track.enabled = true;
            });
        }
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

            {localStream && !isOffCam && (
                <View className="absolute right-3 top-14 rounded-[20px] m-0 p-0 overflow-hidden w-[117] h-[165] bg-accent border-[4px] border-accent">
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
                    appointmentEtUser={appointmentEtUser}
                    elapsedTime={elapsedTime}

                />
            </View>

            <RatingModal
                visible={ratingModalVisible}
                onClose={() => {
                    setRatingModalVisible(false);
                    navigate("Appointments");
                }}
                appointmentEtUser={appointmentEtUser}
            />
        </View>
    );
}