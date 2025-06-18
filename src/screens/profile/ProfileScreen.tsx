import React from 'react';
import {View, Text,TouchableOpacity, Alert} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from "react-native-vector-icons/Ionicons";
import { RootState } from '../../store/store';
import { logoutRequest } from '../../store/authentification/reducer';
import { navigate } from '../../services/navigationService';
import GoBack from '../../components/common/GoBack';
import { auth } from '../../config/firebase.config';



type ProfileOptionType = {
  id: string;
  title: string;
  onPress(): void;
  hide?: boolean;
};

export const ProfileScreen: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
const getToken = async () => {
    return await auth.currentUser?.getIdToken();
};

getToken().then(token => console.log(token)).catch(error => console.error("Erreur :", error));


  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      {
        text: 'Annuler',
        style: 'cancel',
      },
      {
        text: 'Déconnexion',
        onPress: () => {
          dispatch(logoutRequest() as any);
        },
      },
    ]);
  };

  const optionsList: ProfileOptionType[] = [
    {id:"personalInfo" ,title: "Mes informations personnelles", onPress: ()=> navigate("ProfileInfoScreen")},
    {id:"bill" ,title: "Mes factures", onPress: ()=> navigate('FacturesScreen')},
    {id:"availability" ,title: "Disponibilités", onPress: ()=> navigate("ConnectedUserAvailability"), hide: user?.role !== 'PRO'},
    {id:"logout" ,title: "Déconnexion", onPress: ()=> handleLogout()},
  ]

  return (
    <View className="flex-1 pt-12 px-2.5 bg-white flex-col">
      
      <View className="">
        <View className="rounded-xl bg-background-muted px-7">
          {optionsList.map((option, index)=> !option?.hide &&(
              <TouchableOpacity
                  key={option.id}
                  className={`flex-row justify-between items-center h-[58] ${index < optionsList.length ? "border-b-[0.5px] border-accent" : ""}`}
                  onPress={option.onPress}
              >
                <Text className="text-base text-muted/90 font-normal">{option.title}</Text>
                <Icon name="chevron-forward-outline" size={20} color="#7E8184"/>
              </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

export default ProfileScreen;
