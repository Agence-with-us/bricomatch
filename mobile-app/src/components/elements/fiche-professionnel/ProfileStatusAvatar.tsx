import React from "react";
import { Image, Text, View } from "react-native";
import { UserLocal } from "../../../store/users/types";
import UserInitials from "../users/UserInitials";

const AVATAR_SIZE = 125; // Taille de l'avatar
const STATUS_SIZE = 25; // Taille de l'indicateur de statut

export const ProfileStatusAvatar: React.FC<{ user: UserLocal }> = ({ user }) => {

    return (
        <View
            className="items-center justify-center rounded-full relative"
            style={{
                width: AVATAR_SIZE,
                height: AVATAR_SIZE,
            }}
        >
            {!user.photoUrl ? <UserInitials nom={user.nom} prenom={user.prenom} size="xl" />
                :
                <Image src={user.photoUrl} className="rounded-full"
                    style={{
                        width: AVATAR_SIZE,
                        height: AVATAR_SIZE
                    }}
                />}
            <View
                className={`absolute top-[-3px] right-1.5 rounded-full border border-white bg-green-500`}
                style={{
                    width: STATUS_SIZE,
                    height: STATUS_SIZE,
                }}
            />
        </View>
    );
}
