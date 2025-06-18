import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {TouchableOpacity} from "react-native-gesture-handler";

import { navigate, navigationRef } from "../../services/navigationService";

interface GoBackProps {
    onGoBack?(): void
    diameter?: number,
}
export default function GoBack({ diameter = 35}: Readonly<GoBackProps>){
    return (
        <TouchableOpacity
            className="rounded-full bg-muted/30 justify-center items-center ml-2"
            onPress={() => {
                //@ts-ignore
                navigationRef.current.canGoBack() ? navigationRef.current.goBack() : navigate("Home")
            }}
            style={{
                width: diameter,
                height: diameter
            }}
        >
            <Icon name="chevron-back-outline" size={20} color="white"/>
        </TouchableOpacity>
    )
}
