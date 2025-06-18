import React, { memo } from "react";
import {ScrollView, Text, View, Image, useWindowDimensions, TouchableOpacity} from "react-native";
import { useSelector} from "react-redux";
import {isEmpty} from "lodash";
import { RootState } from "../../../store/store";
import { Service } from "../../../store/services/types";
import { navigate } from "../../../services/navigationService";


 function HomeListServices(){
    const { width } = useWindowDimensions();
    const { services } = useSelector((state: RootState) => state.services);
   
    return (
        <View className="mt-10">
            <Text className="font-bold text-muted text-[19px]">
                Services
            </Text>
            <View className="mt-3 -mr-4">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row w-full"
                >
                    {isEmpty(services) ? (
                            <View className="mx-auto w-screen">
                                <Text className="text-muted-disabled text-base font-medium">Aucun service trouvée</Text>
                            </View>
                    ) : services.map((service : Service, index : number) => (
                        <TouchableOpacity key={index} className="mr-4 rounded-[20px] overflow-hidden"
                        onPress={()=> navigate("HomeSearch",{serviceId : service.id})}
                        style={{
                            width: width > 768 ? 260 : 220,
                            height: width > 768 ? 180 : 150
                        }}
                        >
                            <View className="absolute w-full h-full bg-muted/30 z-[2]"/>
                            <Image src={service.imageUrl} className="w-full h-52 rounded-lg z-[1]" resizeMode="cover" />
                            <View className="absolute h-full w-full inset-0 justify-center items-center">
                                <Text className="text-white text-[19px] font-bold text-center z-[3]">{service.name}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    )
}

export default memo(HomeListServices);