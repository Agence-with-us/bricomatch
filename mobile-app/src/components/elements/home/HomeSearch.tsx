import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, useWindowDimensions, View, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { RootStackParamList } from "../../../types/RootStackParamList";
import { RootState } from "../../../store/store";
import { Service } from "../../../store/services/types";
import { navigate } from "../../../services/navigationService";
import { fetchProUsersByServiceRequest } from "../../../store/users/reducer";
import ProUsersList from "../users/ProUsersList";


const HomeSearch: React.FC = () => {
    const route = useRoute<RouteProp<RootStackParamList, 'HomeSearch'>>();
    const serviceId = route?.params?.serviceId || '';


    // Liste des services
    const { services } = useSelector((state: RootState) => state.services);


    // Recuprer le service selectionné ou recherché
    const [selectedService, setSelectedService] = useState<Service | undefined>(serviceId ? services?.find(({ id }) => id === serviceId) : undefined);

    // Valeur ou service recherché
    const [searchValue, setSearchValue] = useState<string | undefined>();




    return (
        <View className="p-5">
           
            <View
                className={`flex-row items-center bg-background-muted rounded-full px-4 py-2 border-[0.5px] border-[#7E8184]/50 h-[50] ${selectedService ? "pr-1.5 py-1" : ""
                    }`}
            >
                <Icon
                    name={selectedService ? "chevron-back-outline" : "search-outline"}
                    size={20}
                    color="#313131B2"
                    onPress={() => {
                        if (selectedService) {
                            setSelectedService(undefined);
                            setSearchValue(undefined);
                        }
                    }}
                />
                <TextInput
                    value={searchValue}
                    onChangeText={(text) => setSearchValue(text)}
                    placeholder={selectedService?.name ?? "Trouver un service"}
                    placeholderTextColor="#313131B2"
                    className="flex-1 text-muted/70 font-medium ml-3"
                    editable={!selectedService}
                />
                {selectedService && (
                    <View className="rounded-full p-2 bg-secondary">
                        <Icon name="search-outline" size={20} color="white" />
                    </View>
                )}
            </View>
            {selectedService?.id
                ? <ProUsersList serviceId={selectedService.id} />
                : <>
                    <Text className="text-muted-disabled text-[15px] font-bold mb-2  mt-5 ">SERVICES LES PLUS DEMANDÉS</Text>
                    <View className="rounded-xl bg-background-muted px-7">
                        {services
                            ?.filter(({ name }) => !searchValue || name.toLowerCase().trim().includes(searchValue.toLowerCase().trim()))
                            .map((service, index) => (
                                <TouchableOpacity
                                    key={service.id}
                                    className={`flex-row justify-between items-center h-[58] ${index < services?.length ? "border-b-[0.5px] border-accent" : ""
                                        }`}
                                    onPress={() => {
                                        setSearchValue(undefined);
                                        setSelectedService(service);
                                    }}
                                >
                                    <Text className="text-base text-muted/90 font-normal">{service.name}</Text>
                                    <Icon name="chevron-forward-outline" size={20} color="#7E8184" />
                                </TouchableOpacity>
                            ))}
                    </View>
                </>}
        </View>
    );
};

export default HomeSearch;
